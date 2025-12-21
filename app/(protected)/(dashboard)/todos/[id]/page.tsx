"use client";

import React, { useEffect, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import { useSupabaseClient, useUser } from "@/context/SupabaseProvider";
import { Todo } from "@/model/Todo";
import { Profile } from "@/model/Profile";
import dynamic from "next/dynamic";
import { ArrowLeft, Calendar, Save, Lock, User, Check, Tag, FileText, Loader2, CalendarDays } from "lucide-react";
import { CategoryCombobox } from "@/components/todos/CategoryCombobox";

// Dynamically import BlockEditor to avoid SSR issues
const Editor = dynamic(() => import("@/components/BlockEditor"), { ssr: false });

const TodoDetailPage = () => {
    const { id } = useParams();
    const router = useRouter();
    const { user } = useUser();
    const supabase = useSupabaseClient();

    const [todo, setTodo] = useState<Todo | null>(null);
    const [profiles, setProfiles] = useState<Profile[]>([]); // All users
    const [content, setContent] = useState(""); // For 'content' (long form)
    const [description, setDescription] = useState(""); // For 'description' (summary)
    const [localTitle, setLocalTitle] = useState("");
    const [editorInitialContent, setEditorInitialContent] = useState<string | null>(null);
    const [loading, setLoading] = useState(true);
    const [saving, setSaving] = useState(false);
    const [lastSaved, setLastSaved] = useState<Date | null>(null);
    const [assigneeDropdownOpen, setAssigneeDropdownOpen] = useState(false);
    const [exporting, setExporting] = useState(false);
    const [linkedEvents, setLinkedEvents] = useState<{ id: string; summary: string; start: string }[]>([]);
    const [loadingEvents, setLoadingEvents] = useState(false);

    // Refs for synchronization guards
    const lastLocalEdit = React.useRef<number>(0);
    const isSavingRef = React.useRef<boolean>(false);

    // Reusable Fetch Function
    // Wrapped in useCallback to be safe for useEffect dependencies
    const fetchData = React.useCallback(async () => {
        if (!id || !user) return;
        // Don't set loading on re-fetches to avoid flicker, only initial
        // But we need to know if it's initial load. 
        // We can check if todo is null? Or just skip setLoading(true) here and handle it initially?
        // Let's safe-guard: if we are loading, keep it.

        // Fetch Todo
        const { data: todoData, error: todoError } = await supabase
            .from("todos")
            .select(`
                *,
                todo_assignees (
                    user_id,
                    profiles:user_id (*)
                )
            `)
            .eq("id", id)
            .single();

        // Fetch Profiles
        const { data: profilesData, error: profilesError } = await supabase
            .from("profiles")
            .select("*");

        if (todoError) {
            console.error("Error fetching todo:", todoError);
            router.push("/todos");
        } else {
            // Map assignees
            const assignees = todoData.todo_assignees?.map((ta: any) => ta.profiles).filter(Boolean) || [];
            const finalTodo: Todo = { ...todoData, assignees };

            // Synchronization Guard: Only update if not currently saving AND some time has passed since last edit
            const isSafeToUpdate = !isSavingRef.current && (Date.now() - lastLocalEdit.current > 2000);

            if (isSafeToUpdate) {
                setTodo(finalTodo);

                const serverContent = todoData.content || "";
                const serverDesc = todoData.description || "";
                const serverTitle = todoData.title || "";

                setLocalTitle(prev => {
                    if (prev !== serverTitle) return serverTitle;
                    return prev;
                });

                setContent(prev => {
                    if (prev !== serverContent) {
                        return serverContent;
                    }
                    return prev;
                });

                setDescription(prev => {
                    if (prev !== serverDesc) {
                        return serverDesc;
                    }
                    return prev;
                });

                // Set initial content for the uncontrolled editor only if not already set
                if (editorInitialContent === null) {
                    setEditorInitialContent(serverContent);
                }
            }
        }

        if (profilesData) {
            setProfiles(profilesData);
        }

        setLoading(false);
    }, [id, user, supabase, router]);

    // 1. Initial Fetch
    useEffect(() => {
        setEditorInitialContent(null); // Reset when ID changes
        fetchData();
    }, [id]); // fetchData is stable enough, but we mainly care about id change

    // 2. Realtime Sync Subscription
    useEffect(() => {
        if (!id || !supabase) return;

        const channel = supabase
            .channel(`todo_detail:${id}`)
            .on(
                'postgres_changes',
                {
                    event: 'UPDATE',
                    schema: 'public',
                    table: 'todos',
                    filter: `id=eq.${id}`
                },
                () => {
                    // When the todo is updated (including "touched" updated_at), we re-fetch everything.
                    fetchData();
                }
            )
            .on(
                'postgres_changes',
                {
                    event: '*',
                    schema: 'public',
                    table: 'todo_assignees',
                    filter: `todo_id=eq.${id}`
                },
                () => {
                    // We keep this for immediate feedback on INSERTs if they work
                    fetchData();
                }
            )
            .subscribe();

        return () => {
            supabase.removeChannel(channel);
        };
    }, [id, supabase, fetchData]);

    // Fetch linked calendar events from Supabase
    useEffect(() => {
        if (!id) return;
        const fetchLinkedEvents = async () => {
            setLoadingEvents(true);
            try {
                const { data, error } = await supabase
                    .from('calendar_todo_links')
                    .select('*')
                    .eq('todo_id', id)
                    .order('created_at', { ascending: false });

                if (error) {
                    console.error('Failed to fetch linked events:', error);
                } else if (data) {
                    setLinkedEvents(data.map((link: any) => ({
                        id: link.calendar_event_id,
                        summary: link.event_summary || '(제목 없음)',
                        start: link.event_start || ''
                    })));
                }
            } catch (e) {
                console.error('Failed to fetch linked events:', e);
            }
            setLoadingEvents(false);
        };
        fetchLinkedEvents();
    }, [id, supabase]);

    // Permission Logic
    const hasAssignees = todo?.assignees && todo.assignees.length > 0;
    const isAssignee = !!(user && todo?.assignees?.some(a => a.id === user.id));
    const canEdit = !hasAssignees || isAssignee;

    // 3. Consolidated Consolidated Auto-save (Title, Content, Description)
    useEffect(() => {
        if (!todo || loading || !canEdit) return;

        // Check if anything actually changed from the source of truth
        const isTitleChanged = localTitle !== (todo.title || "");
        const isContentChanged = content !== (todo.content || "");
        const isDescChanged = description !== (todo.description || "");

        if (!isTitleChanged && !isContentChanged && !isDescChanged) return;

        const timer = setTimeout(async () => {
            setSaving(true);
            isSavingRef.current = true;
            try {
                const { error } = await supabase
                    .from("todos")
                    .update({
                        title: localTitle,
                        content: content,
                        description: description,
                        updated_at: new Date().toISOString()
                    })
                    .eq("id", id);

                if (!error) {
                    setLastSaved(new Date());
                    setTodo(prev => prev ? ({ ...prev, title: localTitle, content, description }) : null);
                }
            } catch (err) {
                console.error("Auto-save failed:", err);
            } finally {
                setSaving(false);
                isSavingRef.current = false;
            }
        }, 1000);

        return () => clearTimeout(timer);
    }, [localTitle, content, description, todo, id, supabase, loading, canEdit]);

    // 6. Manual Save Shortcut (Ctrl+S / Cmd+S)
    const handleManualSave = React.useCallback(async () => {
        if (!todo || !canEdit || saving) return;

        setSaving(true);
        isSavingRef.current = true;

        try {
            const { error } = await supabase
                .from("todos")
                .update({
                    title: localTitle,
                    content: content,
                    description: description,
                    updated_at: new Date().toISOString()
                })
                .eq("id", id);

            if (!error) {
                setLastSaved(new Date());
                setTodo(prev => prev ? ({ ...prev, title: localTitle, content, description }) : null);
            }
        } catch (e) {
            console.error("Manual save failed:", e);
        } finally {
            setSaving(false);
            isSavingRef.current = false;
        }
    }, [todo, canEdit, saving, localTitle, content, description, id, supabase]);

    // Stable callback for BlockEditor to prevent redundant re-renders
    const handleEditorChange = React.useCallback((val: string) => {
        setContent(val);
        lastLocalEdit.current = Date.now();
    }, []);

    useEffect(() => {
        const handleKeyDown = (e: KeyboardEvent) => {
            if ((e.ctrlKey || e.metaKey) && e.key === 's') {
                e.preventDefault();
                handleManualSave();
            }
        };

        window.addEventListener('keydown', handleKeyDown);
        return () => window.removeEventListener('keydown', handleKeyDown);
    }, [handleManualSave]);

    if (loading) {
        return (
            <div className="w-full h-full flex items-center justify-center bg-[#F8FAFC]">
                <div className="animate-pulse flex flex-col items-center">
                    <div className="h-4 w-32 bg-slate-200 rounded mb-4"></div>
                </div>
            </div>
        );
    }

    if (!todo) return null;

    return (
        <div className="w-full h-full bg-[#F8FAFC] overflow-y-auto">
            <div className="max-w-4xl mx-auto min-h-screen bg-white shadow-sm my-8 rounded-[32px] p-12 flex flex-col relative">

                {/* Header / Navigation */}
                <div className="flex items-center justify-between mb-8 group">
                    <button
                        onClick={() => {
                            if (todo.project_id) {
                                router.push(`/todos?projectId=${todo.project_id}`);
                            } else {
                                router.push("/todos");
                            }
                        }}
                        className="flex items-center text-slate-400 hover:text-slate-700 transition-colors gap-1 px-2 py-1 -ml-2 rounded-lg hover:bg-slate-50"
                    >
                        <ArrowLeft size={18} />
                        <span className="font-bold text-sm">돌아가기</span>
                    </button>

                    <div className="flex items-center gap-3 text-xs font-medium text-slate-300">
                        {/* Google Drive Export Button */}
                        <button
                            onClick={async () => {
                                if (saving || exporting) return;
                                if (!confirm("현재 내용을 구글 문서로 내보내시겠습니까?")) return;

                                setExporting(true);
                                try {
                                    // Construct Filename: YYYY-MM-DD_Category_Title
                                    const dateStr = new Date().toISOString().split('T')[0];
                                    const categoryName = todo.categories?.name || "기타";
                                    const fileName = `${dateStr}_${categoryName}_${todo.title}`;

                                    const res = await fetch("/api/drive/create-doc", {
                                        method: "POST",
                                        headers: { "Content-Type": "application/json" },
                                        body: JSON.stringify({
                                            title: fileName,
                                            content: content // Use the markdown content
                                        }),
                                    });

                                    if (res.ok) {
                                        const data = await res.json();
                                        if (confirm("구글 문서가 생성되었습니다! 지금 확인하시겠습니까?")) {
                                            window.open(data.webViewLink, "_blank");
                                        }
                                    } else {
                                        const err = await res.json();
                                        if (res.status === 401 || err.error?.includes("Google")) {
                                            if (confirm("Google Drive 연동이 필요합니다. 지금 연동하시겠습니까?")) {
                                                await supabase.auth.signInWithOAuth({
                                                    provider: 'google',
                                                    options: {
                                                        redirectTo: window.location.href,
                                                        queryParams: {
                                                            access_type: 'offline',
                                                            prompt: 'consent'
                                                        },
                                                        scopes: 'https://www.googleapis.com/auth/drive.file'
                                                    }
                                                });
                                            }
                                        } else {
                                            alert(`오류가 발생했습니다: ${err.error}`);
                                        }
                                    }
                                } catch (e) {
                                    console.error(e);
                                    alert("내보내기 중 문제가 발생했습니다.");
                                } finally {
                                    setExporting(false);
                                }
                            }}
                            disabled={exporting}
                            className="flex items-center gap-1 hover:text-slate-600 transition-colors disabled:opacity-50"
                            title="Save to Google Drive"
                        >
                            {exporting ? (
                                <Loader2 className="animate-spin" size={14} />
                            ) : (
                                <FileText size={14} />
                            )}
                            <span className="hidden sm:inline">Docs 저장</span>
                        </button>

                        <div className="w-[1px] h-3 bg-slate-200 mx-1"></div>

                        {!canEdit && (
                            <span className="text-slate-400 flex items-center gap-1">
                                <Lock size={12} /> 읽기 전용
                            </span>
                        )}
                        {saving ? (
                            <span className="text-blue-500 flex items-center gap-1 animate-pulse">
                                <Save size={12} /> 저장 중...
                            </span>
                        ) : lastSaved ? (
                            <span>{lastSaved.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}에 저장됨</span>
                        ) : (
                            <span>최신 상태</span>
                        )}
                    </div>
                </div>

                {/* Title Section */}
                <div className="mb-4">
                    <input
                        className="w-full text-4xl font-bold text-slate-900 placeholder:text-slate-300 border-none focus:ring-0 p-0 bg-transparent mb-2 disabled:opacity-70 disabled:cursor-not-allowed outline-none focus:outline-none ring-0 focus:ring-offset-0"
                        value={localTitle}
                        onChange={(e) => {
                            setLocalTitle(e.target.value);
                            lastLocalEdit.current = Date.now();
                        }}
                        placeholder="Untitled"
                        disabled={!canEdit}
                    />
                </div>

                {/* Properties Section (Notion Style) */}
                <div className="flex flex-col gap-1 mb-8">

                    {/* Status Property */}
                    <div className="flex items-center py-1.5 group/prop">
                        <div className="w-[120px] flex items-center gap-2 text-slate-500 text-sm">
                            <div className="p-0.5 rounded text-slate-400">
                                <Check size={16} />
                            </div>
                            <span>상태</span>
                        </div>
                        <div className="flex-1">
                            <select
                                value={todo.status || 'backlog'}
                                onChange={async (e) => {
                                    const newStatus = e.target.value as any;

                                    if ((newStatus === 'done' || newStatus === 'in-progress') && (!todo.assignees || todo.assignees.length === 0)) {
                                        alert("담당자가 지정되지 않은 할 일은 진행 중 또는 완료 상태로 변경할 수 없습니다.");
                                        return;
                                    }

                                    // Calculate new values
                                    const now = new Date().toISOString();
                                    const newCompletedAt = newStatus === 'done' ? now : undefined;

                                    // 1. Optimistic Update
                                    setTodo({
                                        ...todo,
                                        status: newStatus,
                                        completed_at: newCompletedAt
                                        // Note: updated_at is also updated on server but we don't strictly need it for UI right now
                                    });

                                    // 2. Server Update
                                    const updateData = {
                                        status: newStatus,
                                        updated_at: now,
                                        completed_at: newCompletedAt
                                    };

                                    await supabase.from("todos").update(updateData).eq("id", id);
                                }}
                                disabled={!canEdit}
                                className="text-sm text-slate-700 hover:bg-slate-50 px-2 -ml-2 py-0.5 rounded cursor-pointer transition-colors bg-transparent border-none focus:ring-0 disabled:cursor-not-allowed disabled:opacity-70 disabled:hover:bg-transparent outline-none focus:outline-none ring-0 focus:ring-offset-0 appearance-none"
                            >
                                <option value="backlog">대기중</option>
                                <option value="in-progress">진행중</option>
                                <option value="done">완료</option>
                            </select>
                        </div>
                    </div>

                    {/* Assignee Property (Multi-user Support) */}
                    <div className="flex items-center py-1.5 group/prop">
                        <div className="w-[120px] flex items-center gap-2 text-slate-500 text-sm">
                            <div className="p-0.5 rounded text-slate-400">
                                <User size={16} />
                            </div>
                            <span>담당자</span>
                        </div>
                        <div className="flex-1">
                            <div className="relative">
                                <button
                                    onClick={() => setAssigneeDropdownOpen(!assigneeDropdownOpen)}
                                    disabled={!canEdit && todo.status === 'done'}
                                    className="flex items-center gap-2 px-2 py-1 -ml-2 rounded hover:bg-slate-50 transition-colors disabled:cursor-not-allowed disabled:opacity-70 text-sm text-slate-700 min-h-[28px]"
                                >
                                    {todo.assignees && todo.assignees.length > 0 ? (
                                        <div className="flex items-center -space-x-2 overflow-hidden">
                                            {todo.assignees.map((assignee) => (
                                                <div key={assignee.id} className="relative w-6 h-6 ring-2 ring-white rounded-full bg-slate-200 overflow-hidden" title={assignee.nickname || assignee.name}>
                                                    {assignee.avatar_url ? (
                                                        <img src={assignee.avatar_url} alt={assignee.name} className="w-full h-full object-cover" />
                                                    ) : (
                                                        <div className="w-full h-full flex items-center justify-center text-[8px] font-bold text-slate-500">
                                                            {assignee.name?.[0]?.toUpperCase() || "?"}
                                                        </div>
                                                    )}
                                                </div>
                                            ))}
                                        </div>
                                    ) : (
                                        <span className="text-slate-400">담당자 없음</span>
                                    )}
                                </button>

                                {assigneeDropdownOpen && (
                                    <>
                                        <div
                                            className="fixed inset-0 z-10"
                                            onClick={() => setAssigneeDropdownOpen(false)}
                                        />
                                        <div className="absolute top-full left-0 mt-1 w-[240px] bg-white rounded-lg shadow-xl border border-slate-100 py-1 z-20 max-h-[300px] overflow-y-auto">
                                            {/* Only show Myself as a toggle option */}
                                            {(() => {
                                                const myProfile = profiles.find(p => p.id === user?.id);
                                                if (!myProfile) return null;

                                                const isAssigned = todo.assignees?.some(a => a.id === myProfile.id);

                                                return (
                                                    <button
                                                        key={myProfile.id}
                                                        onClick={async () => {
                                                            let newAssignees = todo.assignees || [];
                                                            const now = new Date().toISOString();
                                                            if (isAssigned) {
                                                                // Unassign Me
                                                                newAssignees = newAssignees.filter(a => a.id !== myProfile.id);
                                                                setTodo({ ...todo, assignees: newAssignees });
                                                                await supabase.from("todo_assignees").delete().match({ todo_id: id, user_id: myProfile.id });
                                                            } else {
                                                                // Assign Me
                                                                newAssignees = [...newAssignees, myProfile];
                                                                setTodo({ ...todo, assignees: newAssignees });
                                                                await supabase.from("todo_assignees").insert({ todo_id: id, user_id: myProfile.id });
                                                            }
                                                            // Important: Touch the todo to trigger realtime update for everyone (including those listening to 'todos')
                                                            // This ensures permissions are re-evaluated immediately even if the 'todo_assignees' listener misses the DELETE event.
                                                            await supabase.from("todos").update({ updated_at: now }).eq("id", id);

                                                            setAssigneeDropdownOpen(false);
                                                        }}
                                                        className="w-full text-left px-3 py-2 text-sm hover:bg-slate-50 transition-colors flex items-center justify-between"
                                                    >
                                                        <div className="flex items-center gap-3">
                                                            <div className="w-8 h-8 rounded-full overflow-hidden bg-slate-100 flex-shrink-0 border border-slate-100">
                                                                {myProfile.avatar_url ? (
                                                                    <img src={myProfile.avatar_url} alt={myProfile.name} className="w-full h-full object-cover" />
                                                                ) : (
                                                                    <div className="w-full h-full flex items-center justify-center text-xs font-bold text-slate-400">
                                                                        {myProfile.name?.[0]?.toUpperCase() || "?"}
                                                                    </div>
                                                                )}
                                                            </div>
                                                            <div className="flex flex-col min-w-0">
                                                                <span className="font-medium text-slate-900 truncate">{myProfile.nickname || myProfile.name} (나)</span>
                                                                <span className="text-xs text-slate-400 truncate">{myProfile.name}</span>
                                                            </div>
                                                        </div>
                                                        {isAssigned && <Check size={16} className="text-blue-500" />}
                                                    </button>
                                                );
                                            })()}
                                        </div>
                                    </>
                                )}
                            </div>
                        </div>
                    </div>

                    {/* Due Date Property (Editable) */}
                    <div className="flex items-center py-1.5 group/prop">
                        <div className="w-[120px] flex items-center gap-2 text-slate-500 text-sm">
                            <div className="p-0.5 rounded text-slate-400">
                                <Calendar size={16} />
                            </div>
                            <span>마감일</span>
                        </div>
                        <div className="flex-1 flex items-center gap-2">
                            <input
                                type="date"
                                value={todo.due_date ? new Date(todo.due_date).toISOString().split('T')[0] : ""}
                                onChange={async (e) => {
                                    const newDate = e.target.value ? new Date(e.target.value).toISOString() : null;
                                    setTodo({ ...todo, due_date: newDate || undefined });
                                    await supabase.from("todos").update({ due_date: newDate }).eq("id", id);
                                }}
                                disabled={!canEdit}
                                className="text-sm text-slate-700 hover:bg-slate-50 px-2 -ml-2 py-0.5 rounded cursor-pointer transition-colors bg-transparent border-none focus:ring-0 disabled:cursor-not-allowed disabled:opacity-70 disabled:hover:bg-transparent outline-none focus:outline-none ring-0 focus:ring-offset-0"
                            />

                            {/* Late Chip */}
                            {(() => {
                                if (todo.status === 'done' && todo.completed_at && todo.due_date) {
                                    const doneDate = new Date(todo.completed_at);
                                    const dueDate = new Date(todo.due_date);
                                    // Reset hours to compare dates only
                                    doneDate.setHours(0, 0, 0, 0);
                                    dueDate.setHours(0, 0, 0, 0);

                                    const diffTime = doneDate.getTime() - dueDate.getTime();
                                    const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));

                                    if (diffDays > 0) {
                                        return (
                                            <span className="text-[10px] font-medium bg-red-100 text-red-600 px-1.5 py-0.5 rounded-full">
                                                +{diffDays}일 지연
                                            </span>
                                        );
                                    }
                                }
                                return null;
                            })()}
                        </div>
                    </div>

                    {/* Linked Calendar Events Property */}
                    <div className="flex items-start py-1.5 group/prop">
                        <div className="w-[120px] flex items-center gap-2 text-slate-500 text-sm">
                            <div className="p-0.5 rounded text-slate-400">
                                <CalendarDays size={16} />
                            </div>
                            <span>일정</span>
                        </div>
                        <div className="flex-1">
                            {loadingEvents ? (
                                <span className="text-xs text-slate-400 flex items-center gap-1">
                                    <Loader2 size={12} className="animate-spin" /> 불러오는 중...
                                </span>
                            ) : linkedEvents.length > 0 ? (
                                <div className="flex flex-col gap-1">
                                    {linkedEvents.map(ev => {
                                        // Extract date for calendar navigation (use local date, not UTC)
                                        let eventDate = '';
                                        if (ev.start) {
                                            const d = new Date(ev.start);
                                            eventDate = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
                                        }
                                        return (
                                            <a
                                                key={ev.id}
                                                href={eventDate ? `/calendar?date=${eventDate}` : '/calendar'}
                                                className="flex items-center gap-2 px-2 py-1 -ml-2 rounded hover:bg-blue-50 transition-colors text-sm text-blue-600 group/event"
                                            >
                                                <CalendarDays size={14} className="text-blue-400 shrink-0" />
                                                <span className="font-medium truncate">{ev.summary || '(제목 없음)'}</span>
                                                <span className="text-xs text-slate-400 shrink-0">
                                                    {ev.start ? new Date(ev.start).toLocaleDateString('ko-KR', { month: 'short', day: 'numeric' }) : ''}
                                                </span>
                                            </a>
                                        );
                                    })}
                                </div>
                            ) : (
                                <span className="text-sm text-slate-400">연결된 일정 없음</span>
                            )}
                        </div>
                    </div>

                    {/* Category Property */}
                    <div className="flex items-center py-1.5 group/prop">
                        <div className="w-[120px] flex items-center gap-2 text-slate-500 text-sm">
                            <div className="p-0.5 rounded text-slate-400">
                                <Tag size={16} />
                            </div>
                            <span>카테고리</span>
                        </div>
                        <div className="flex-1">
                            {todo.project_id ? (
                                <CategoryCombobox
                                    projectId={todo.project_id}
                                    value={todo.category_id}
                                    onChange={async (categoryId) => {
                                        setTodo({ ...todo, category_id: categoryId || undefined });
                                        // Update category and touch updated_at
                                        await supabase.from("todos").update({
                                            category_id: categoryId,
                                            updated_at: new Date().toISOString()
                                        }).eq("id", id);
                                    }}
                                    className="w-full max-w-[240px]"
                                />
                            ) : (
                                <span className="text-sm text-slate-400 italic">프로젝트 없음</span>
                            )}
                        </div>
                    </div>

                    {/* Description Property (The Summary) */}
                    <div className="flex items-start py-1.5 group/prop">
                        <div className="w-[120px] flex items-center gap-2 text-slate-500 text-sm pt-0.5">
                            <div className="p-0.5 rounded text-slate-400">
                                <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><line x1="21" x2="3" y1="6" y2="6" /><line x1="21" x2="9" y1="12" y2="12" /><line x1="21" x2="7" y1="18" y2="18" /></svg>
                            </div>
                            <span>요약</span>
                        </div>
                        <div className="flex-1">
                            <textarea
                                value={description}
                                onChange={(e) => {
                                    setDescription(e.target.value);
                                    lastLocalEdit.current = Date.now();
                                    // Auto-resize immediately on change
                                    e.target.style.height = 'auto';
                                    e.target.style.height = `${e.target.scrollHeight}px`;
                                }}
                                placeholder={canEdit ? "빈 값" : "내용 없음"}
                                rows={1}
                                disabled={!canEdit}
                                className="w-full text-slate-700 bg-transparent border-none focus:ring-0 p-0 resize-none text-sm placeholder:text-slate-300 -ml-2 px-2 py-0.5 rounded hover:bg-slate-50 transition-colors disabled:cursor-not-allowed disabled:opacity-70 disabled:hover:bg-transparent overflow-hidden outline-none focus:outline-none ring-0 focus:ring-offset-0"
                                style={{ minHeight: '24px' }}
                                ref={(textarea) => {
                                    if (textarea) {
                                        // Auto-resize on initial render and updates
                                        textarea.style.height = 'auto';
                                        textarea.style.height = `${textarea.scrollHeight}px`;
                                    }
                                }}
                            />
                        </div>
                    </div>
                </div>

                {/* Divider */}
                <hr className="border-slate-100 mb-8" />

                {/* Editor Area - Notion Style */}
                <div className="flex-1 w-full min-h-[500px]">
                    {editorInitialContent !== null && (
                        <Editor
                            key={id as string}
                            initialContent={editorInitialContent}
                            onChange={handleEditorChange}
                            editable={canEdit}
                        />
                    )}
                </div>
            </div>
        </div>
    );
};

export default TodoDetailPage;
