"use client";

import React, { useEffect, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import { useSupabaseClient, useUser } from "@/context/SupabaseProvider";
import { Todo } from "@/model/Todo";
import { Profile } from "@/model/Profile";
import dynamic from "next/dynamic";
import { ArrowLeft, Calendar, Save, Lock, User } from "lucide-react";


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
    const [loading, setLoading] = useState(true);
    const [saving, setSaving] = useState(false);
    const [lastSaved, setLastSaved] = useState<Date | null>(null);
    const [assigneeDropdownOpen, setAssigneeDropdownOpen] = useState(false);

    // Fetch Todo Data & Profiles
    useEffect(() => {
        if (!id || !user) return;

        const fetchData = async () => {
            setLoading(true);

            // 1. Fetch Todo
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

            // 2. Fetch Profiles (for Assignee dropdown)
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

                setTodo(finalTodo);
                setContent(todoData.content || "");
                setDescription(todoData.description || "");
            }

            if (profilesData) {
                setProfiles(profilesData);
            }

            setLoading(false);
        };

        fetchData();
    }, [id, user, supabase, router]);

    // Permission Logic
    const hasAssignees = todo?.assignees && todo.assignees.length > 0;
    const isAssignee = user && todo?.assignees?.some(a => a.id === user.id);
    const canEdit = !hasAssignees || isAssignee;

    // Auto-save logic for CONTENT
    useEffect(() => {
        if (!todo || loading || !canEdit) return;
        if (content === (todo.content || "")) return;

        const timer = setTimeout(async () => {
            setSaving(true);
            const { error } = await supabase
                .from("todos")
                .update({ content: content, updated_at: new Date().toISOString() })
                .eq("id", id);

            if (!error) {
                setLastSaved(new Date());
                setTodo(prev => prev ? ({ ...prev, content }) : null);
            }
            setSaving(false);
        }, 1000);

        return () => clearTimeout(timer);
    }, [content, todo, id, supabase, loading, canEdit]);

    // Auto-save logic for DESCRIPTION
    useEffect(() => {
        if (!todo || loading || !canEdit) return;
        if (description === (todo.description || "")) return;

        const timer = setTimeout(async () => {
            setSaving(true);
            const { error } = await supabase
                .from("todos")
                .update({ description: description, updated_at: new Date().toISOString() })
                .eq("id", id);

            if (!error) {
                setLastSaved(new Date());
                setTodo(prev => prev ? ({ ...prev, description }) : null);
            }
            setSaving(false);
        }, 1000);
        return () => clearTimeout(timer);
    }, [description, todo, id, supabase, loading, canEdit]);

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

    // Current Assignee ID (assuming single assignee for the dropdown)
    const currentAssigneeId = todo.assignees && todo.assignees.length > 0 ? todo.assignees[0].id : "";

    return (
        <div className="w-full h-full bg-[#F8FAFC] overflow-y-auto">
            <div className="max-w-4xl mx-auto min-h-screen bg-white shadow-sm my-8 rounded-[32px] p-12 flex flex-col relative">

                {/* Header / Navigation */}
                <div className="flex items-center justify-between mb-8 group">
                    <button
                        onClick={() => router.back()}
                        className="flex items-center text-slate-400 hover:text-slate-700 transition-colors gap-1 px-2 py-1 -ml-2 rounded-lg hover:bg-slate-50"
                    >
                        <ArrowLeft size={18} />
                        <span className="font-bold text-sm">돌아가기</span>
                    </button>

                    <div className="flex items-center gap-3 text-xs font-medium text-slate-300">
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
                        value={todo.title}
                        onChange={(e) => {
                            const newTitle = e.target.value;
                            setTodo({ ...todo, title: newTitle });
                            supabase.from("todos").update({ title: newTitle }).eq("id", id).then();
                        }}
                        placeholder="Untitled"
                        disabled={!canEdit}
                    />
                </div>

                {/* Properties Section (Notion Style) */}
                <div className="flex flex-col gap-1 mb-8">

                    {/* Assignee Property (Replaces Status) */}
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
                                    disabled={!canEdit}
                                    className="flex items-center gap-2 px-2 py-1 -ml-2 rounded hover:bg-slate-50 transition-colors disabled:cursor-not-allowed disabled:opacity-70 text-sm text-slate-700"
                                >
                                    {currentAssigneeId ? (
                                        (() => {
                                            const profile = profiles.find(p => p.id === currentAssigneeId);
                                            if (!profile) return <span>Unknown User</span>;
                                            return (
                                                <>
                                                    <div className="w-5 h-5 rounded-full overflow-hidden bg-slate-200 flex-shrink-0">
                                                        {profile.avatar_url ? (
                                                            <img src={profile.avatar_url} alt={profile.name} className="w-full h-full object-cover" />
                                                        ) : (
                                                            <div className="w-full h-full flex items-center justify-center text-[10px] font-bold text-slate-500">
                                                                {profile.name?.[0]?.toUpperCase() || "?"}
                                                            </div>
                                                        )}
                                                    </div>
                                                    <span>{profile.nickname || profile.name}</span>
                                                </>
                                            );
                                        })()
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
                                            <button
                                                onClick={async () => {
                                                    setTodo({ ...todo, assignees: [] });
                                                    await supabase.from("todo_assignees").delete().eq("todo_id", id);
                                                    setAssigneeDropdownOpen(false);
                                                }}
                                                className="w-full text-left px-3 py-2 text-sm text-slate-500 hover:bg-slate-50 transition-colors"
                                            >
                                                담당자 없음
                                            </button>

                                            {/* Only show Myself as an option */}
                                            {(() => {
                                                const myProfile = profiles.find(p => p.id === user?.id);
                                                if (!myProfile) return null;

                                                return (
                                                    <button
                                                        key={myProfile.id}
                                                        onClick={async () => {
                                                            // Optimistic update
                                                            setTodo({ ...todo, assignees: [myProfile] });
                                                            setAssigneeDropdownOpen(false);

                                                            // DB Update
                                                            await supabase.from("todo_assignees").delete().eq("todo_id", id);
                                                            await supabase.from("todo_assignees").insert({ todo_id: id, user_id: myProfile.id });
                                                        }}
                                                        className="w-full text-left px-3 py-2 text-sm hover:bg-slate-50 transition-colors flex items-center gap-3"
                                                    >
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
                        <div className="flex-1">
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
                    {/* Add key to force re-mounting when switching todos */}
                    <Editor
                        key={id as string}
                        initialContent={content}
                        onChange={setContent}
                        editable={canEdit}
                    />
                </div>
            </div>
        </div>
    );
};

export default TodoDetailPage;
