"use client";

import React, { useEffect, useState, useMemo } from "react";
import { useSearchParams } from "next/navigation";
import {
    format,
    addMonths,
    subMonths,
    startOfMonth,
    endOfMonth,
    startOfWeek,
    endOfWeek,
    eachDayOfInterval,
    isSameMonth,
    isSameDay,
    addDays,
    isToday,
    startOfDay,
    endOfDay,
    differenceInMinutes
} from "date-fns";
import { ko } from "date-fns/locale";
import { ChevronLeft, ChevronRight, Calendar as CalendarIcon, Loader2, RefreshCw, X, Clock, MapPin, AlignLeft, Trash2, ListTodo, FileText } from "lucide-react";

import { useSupabaseClient } from "@/context/SupabaseProvider";
import { Todo } from "@/model/Todo";

interface CalendarEvent {
    id: string;
    summary: string;
    description?: string;
    location?: string;
    start: {
        dateTime?: string;
        date?: string;
        timeZone?: string;
    };
    end: {
        dateTime?: string;
        date?: string;
        timeZone?: string;
    };
    htmlLink?: string;
    colorId?: string;
}



const CalendarPage = () => {
    const supabase = useSupabaseClient();
    const searchParams = useSearchParams();

    // State
    const [currentDate, setCurrentDate] = useState(new Date()); // The day we are viewing
    const [viewMonth, setViewMonth] = useState(new Date()); // The month we are viewing in sidebar
    const [events, setEvents] = useState<CalendarEvent[]>([]);
    const [selectedEvent, setSelectedEvent] = useState<CalendarEvent | null>(null);
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState<string | null>(null);
    const [needsAuth, setNeedsAuth] = useState(false);
    const [refreshKey, setRefreshKey] = useState(0);
    const [isImporting, setIsImporting] = useState(false);
    const [availableTodos, setAvailableTodos] = useState<Todo[]>([]);
    const [isLoadingTodos, setIsLoadingTodos] = useState(false);
    const [pendingTodoId, setPendingTodoId] = useState<string | null>(null);

    // Edit & Create State
    const [isEditing, setIsEditing] = useState(false);
    const [isCreating, setIsCreating] = useState(false);
    const [editForm, setEditForm] = useState<Partial<CalendarEvent>>({});
    const [isSaving, setIsSaving] = useState(false);

    // Drag Interaction State
    const [dragStart, setDragStart] = useState<number | null>(null);
    const [dragCurrent, setDragCurrent] = useState<number | null>(null);

    // Read date from URL params on mount
    useEffect(() => {
        const dateParam = searchParams.get('date');
        if (dateParam) {
            const parsedDate = new Date(dateParam);
            if (!isNaN(parsedDate.getTime())) {
                setCurrentDate(parsedDate);
                setViewMonth(parsedDate);
            }
        }
    }, [searchParams]);

    // Reset edit state when selection changes
    useEffect(() => {
        if (!selectedEvent && !isCreating) {
            setIsEditing(false);
            setEditForm({});
        }
    }, [selectedEvent?.id, isCreating]);

    // Token Saving Logic from Session
    useEffect(() => {
        const { data: { subscription } } = supabase.auth.onAuthStateChange(async (event, session) => {
            if (event === 'SIGNED_IN' || event === 'TOKEN_REFRESHED') {
                if (session && session.provider_refresh_token) {
                    try {
                        await fetch('/api/save-token', {
                            method: 'POST',
                            headers: { 'Content-Type': 'application/json' },
                            body: JSON.stringify({
                                userId: session.user.id,
                                refreshToken: session.provider_refresh_token
                            })
                        });
                        setRefreshKey(prev => prev + 1);
                        setNeedsAuth(false);
                    } catch (e) {
                        console.error("Failed to save token", e);
                    }
                }
            }
        });
        return () => subscription.unsubscribe();
    }, [supabase]);

    // Fetch Events for the selected day
    useEffect(() => {
        const fetchEvents = async () => {
            setLoading(true);
            setError(null);

            // Fetch for the whole day (00:00 to 23:59:59)
            const timeMin = startOfDay(currentDate).toISOString();
            const timeMax = endOfDay(currentDate).toISOString();

            try {
                const res = await fetch(`/api/calendar/events?timeMin=${timeMin}&timeMax=${timeMax}`);

                if (res.ok) {
                    const data = await res.json();
                    setEvents(data);
                    setNeedsAuth(false);

                    // Update selected event reference if it exists in new data
                    if (selectedEvent) {
                        const updated = data.find((e: CalendarEvent) => e.id === selectedEvent.id);
                        if (updated) setSelectedEvent(updated);
                    }
                } else {
                    const err = await res.json();

                    // Specific check for API enablement
                    if (err.error?.includes("not been used") || err.error?.includes("is disabled")) {
                        setError("Google Cloud Console에서 'Google Calendar API'를 활성화해야 합니다.");
                        setNeedsAuth(false);
                    }
                    else if (res.status === 401 || res.status === 403 || err.error?.includes("token") || err.error?.includes("permission") || err.error?.includes("scope")) {
                        setNeedsAuth(true);
                        // Clear any previous generic error if we know it's auth
                        setError(null);
                    } else {
                        setError(err.error || "Failed to fetch events");
                    }
                }
            } catch (e) {
                console.error(e);
                setError("Network error");
            } finally {
                setLoading(false);
            }
        };

        fetchEvents();
    }, [currentDate, refreshKey]);

    // Handlers
    const handlePrevMonth = () => setViewMonth(subMonths(viewMonth, 1));
    const handleNextMonth = () => setViewMonth(addMonths(viewMonth, 1));
    const handleDateClick = (day: Date) => setCurrentDate(day);

    const handleConnectGoogle = async () => {
        await supabase.auth.signInWithOAuth({
            provider: 'google',
            options: {
                redirectTo: `${window.location.origin}/auth/callback?next=${window.location.pathname}`,
                queryParams: {
                    access_type: 'offline',
                    prompt: 'consent'
                },
                scopes: 'https://www.googleapis.com/auth/calendar.events https://www.googleapis.com/auth/drive.file' // Updated scope for write access
            }
        });
    };

    const handleStartEdit = () => {
        if (!selectedEvent) return;
        setEditForm({
            summary: selectedEvent.summary,
            description: selectedEvent.description,
            location: selectedEvent.location,
            start: selectedEvent.start,
            end: selectedEvent.end
        });
        setIsEditing(true);
        setIsCreating(false);
    };

    const handleSaveEvent = async () => {
        console.log('[Debug] handleSaveEvent called, isCreating:', isCreating);
        if (isCreating) {
            await handleCreateEvent();
            return;
        }

        if (!selectedEvent) return;
        setIsSaving(true);
        try {
            const res = await fetch('/api/calendar/events/update', {
                method: 'PATCH',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    eventId: selectedEvent.id,
                    ...editForm
                })
            });

            if (!res.ok) {
                const errData = await res.json();
                if (res.status === 403 || errData.error?.includes("insufficient authentication scopes")) {
                    setNeedsAuth(true);
                    alert("일정 수정을 위해서는 추가 권한이 필요합니다. 상단 '구글 캘린더 연동' 버튼을 눌러 다시 연동해주세요.");
                    return;
                }
                throw new Error(errData.error || "Failed to update");
            }

            // If we imported from a todo, save the link (or update existing)
            if (selectedEvent.id) {
                const { data: { user } } = await supabase.auth.getUser();
                if (user) {
                    // First, delete any existing link for this event
                    await supabase
                        .from('calendar_todo_links')
                        .delete()
                        .eq('calendar_event_id', selectedEvent.id);

                    // If a new todo was selected, insert the new link
                    if (pendingTodoId) {
                        console.log('[Debug] Saving link - User:', user?.id, 'TodoId:', pendingTodoId, 'EventId:', selectedEvent.id);
                        const { data, error } = await supabase.from('calendar_todo_links').insert({
                            todo_id: pendingTodoId,
                            calendar_event_id: selectedEvent.id,
                            user_id: user.id,
                            event_summary: editForm.summary || selectedEvent.summary,
                            event_start: editForm.start?.dateTime || selectedEvent.start?.dateTime
                        }).select();
                        console.log('[Debug] Link insert result:', data, error);
                    }
                }
                setPendingTodoId(null);
            }

            // Refresh events
            setRefreshKey(prev => prev + 1);
            setIsEditing(false);
        } catch (e: any) {
            console.error(e);
            alert(e.message || "일정 수정에 실패했습니다.");
        } finally {
            setIsSaving(false);
        }
    };

    const handleCreateEvent = async () => {
        setIsSaving(true);
        try {
            if (!editForm.start?.dateTime || !editForm.end?.dateTime) {
                alert("시간 정보가 없습니다.");
                return;
            }

            const res = await fetch('/api/calendar/events/create', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    summary: editForm.summary,
                    description: editForm.description,
                    location: editForm.location,
                    start: editForm.start,
                    end: editForm.end
                })
            });

            if (!res.ok) {
                const errData = await res.json();
                if (res.status === 403 || errData.error?.includes("insufficient authentication scopes")) {
                    setNeedsAuth(true);
                    alert("일정 생성을 위해서는 추가 권한이 필요합니다. 상단 '구글 캘린더 연동' 버튼을 눌러 다시 연동해주세요.");
                    return;
                }
                throw new Error(errData.error || "Failed to create");
            }

            const createdEvent = await res.json();
            console.log('[Debug] Created event:', createdEvent);
            console.log('[Debug] pendingTodoId:', pendingTodoId);

            // If we imported from a todo, save the link
            if (pendingTodoId && createdEvent.id) {
                const { data: { user } } = await supabase.auth.getUser();
                console.log('[Debug] User for insert:', user?.id);
                if (user) {
                    const { data, error } = await supabase.from('calendar_todo_links').insert({
                        todo_id: pendingTodoId,
                        calendar_event_id: createdEvent.id,
                        user_id: user.id,
                        event_summary: editForm.summary,
                        event_start: editForm.start?.dateTime
                    }).select();
                    console.log('[Debug] Insert result:', data, error);
                }
            }

            setRefreshKey(prev => prev + 1);
            setIsCreating(false);
            setEditForm({});
            setSelectedEvent(null);
            setPendingTodoId(null);
        } catch (e: any) {
            console.error(e);
            alert(e.message || "일정 생성에 실패했습니다.");
        } finally {
            setIsSaving(false);
        }
    };

    // Delete Event
    const handleDeleteEvent = async () => {
        if (!selectedEvent) return;
        if (!confirm("정말 이 일정을 삭제하시겠습니까?")) return;

        setIsSaving(true);
        try {
            const res = await fetch(`/api/calendar/events/delete?eventId=${selectedEvent.id}`, {
                method: 'DELETE'
            });

            if (!res.ok) {
                const errData = await res.json();
                throw new Error(errData.error || "Failed to delete");
            }

            // Also delete any associated todo links
            await supabase
                .from('calendar_todo_links')
                .delete()
                .eq('calendar_event_id', selectedEvent.id);

            setRefreshKey(prev => prev + 1);
            setSelectedEvent(null);
            setIsEditing(false);
            setPendingTodoId(null);
        } catch (e: any) {
            console.error(e);
            alert(e.message || "일정 삭제에 실패했습니다.");
        } finally {
            setIsSaving(false);
        }
    };

    const fetchAvailableTodos = async () => {
        setIsLoadingTodos(true);
        const { data: { user } } = await supabase.auth.getUser();
        if (!user) {
            setIsLoadingTodos(false);
            return;
        }

        const { data, error } = await supabase
            .from('todos')
            .select(`
                *,
                todo_assignees (user_id)
            `)
            .in('status', ['backlog', 'in-progress'])
            .order('created_at', { ascending: false });

        if (error) {
            console.error(error);
        } else if (data) {
            // Filter locally for assignment
            // Or better: use a join filter if possible, but local filter is safer with complex RLS sometimes
            const myTodos = data.filter((t: any) =>
                t.todo_assignees.some((ta: any) => ta.user_id === user.id)
            );
            setAvailableTodos(myTodos);
        }
        setIsLoadingTodos(false);
    };

    useEffect(() => {
        if (isImporting) {
            fetchAvailableTodos();
        }
    }, [isImporting]);


    // Drag Handlers
    const handleMouseDown = (e: React.MouseEvent<HTMLDivElement>) => {
        if ((e.target as HTMLElement).closest('.event-block')) return;

        const rect = e.currentTarget.getBoundingClientRect();
        const y = e.clientY - rect.top + e.currentTarget.scrollTop;
        const snappedY = Math.floor(y / 15) * 15;

        setDragStart(snappedY);
        setDragCurrent(null);

        // Don't set isCreating here. Wait for drag or mouseUp.
        setSelectedEvent(null);
        setIsEditing(false);
    };

    const handleMouseMove = (e: React.MouseEvent<HTMLDivElement>) => {
        if (dragStart === null) return;

        const rect = e.currentTarget.getBoundingClientRect();
        const y = e.clientY - rect.top + e.currentTarget.scrollTop;
        const snappedY = Math.floor(y / 15) * 15;

        if (snappedY > dragStart) {
            setDragCurrent(snappedY);
        }
    };

    const handleMouseUp = () => {
        if (dragStart !== null && dragCurrent !== null) {
            const startMinutes = dragStart;
            const endMinutes = Math.max(dragCurrent, dragStart + 15);

            const startDate = new Date(currentDate);
            startDate.setHours(Math.floor(startMinutes / 60), startMinutes % 60, 0, 0);

            const endDate = new Date(currentDate);
            endDate.setHours(Math.floor(endMinutes / 60), endMinutes % 60, 0, 0);

            setEditForm({
                summary: "",
                location: "",
                description: "",
                start: { dateTime: startDate.toISOString(), timeZone: Intl.DateTimeFormat().resolvedOptions().timeZone },
                end: { dateTime: endDate.toISOString(), timeZone: Intl.DateTimeFormat().resolvedOptions().timeZone }
            });
            setIsCreating(true);
        }
        setDragStart(null);
        setDragCurrent(null);
    };

    const toLocalISOString = (isoString?: string) => {
        if (!isoString) return "";
        const date = new Date(isoString);
        if (isNaN(date.getTime())) return "";
        const pad = (n: number) => n.toString().padStart(2, '0');
        return `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(date.getDate())}T${pad(date.getHours())}:${pad(date.getMinutes())}`;
    };

    const handleDateChange = (field: 'start' | 'end', val: string) => {
        if (!val) return;
        const date = new Date(val);
        if (isNaN(date.getTime())) return;

        setEditForm(prev => ({
            ...prev,
            [field]: { dateTime: date.toISOString(), timeZone: Intl.DateTimeFormat().resolvedOptions().timeZone }
        }));
    };

    // Calendar Grid Gen
    const daysInMonth = useMemo(() => {
        const start = startOfWeek(startOfMonth(viewMonth), { weekStartsOn: 0 }); // Sunday start
        const end = endOfWeek(endOfMonth(viewMonth), { weekStartsOn: 0 });
        return eachDayOfInterval({ start, end });
    }, [viewMonth]);

    // Timeline Utils
    const hours = Array.from({ length: 24 }, (_, i) => i);

    // Layout Algo: Greedy Column Assignment for Cascading Overlay
    const processEvents = (rawEvents: CalendarEvent[]) => {
        // Sort by start time, then duration (longest first)
        const sorted = [...rawEvents].sort((a, b) => {
            const startA = new Date(a.start.dateTime!).getTime();
            const startB = new Date(b.start.dateTime!).getTime();
            if (startA !== startB) return startA - startB;

            const durA = new Date(a.end.dateTime!).getTime() - startA;
            const durB = new Date(b.end.dateTime!).getTime() - startB;
            return durB - durA;
        });

        const result: (CalendarEvent & { colIndex: number; totalCols: number })[] = [];
        const columns: number[] = []; // Stores the end time of the last event in each column

        sorted.forEach(ev => {
            const start = new Date(ev.start.dateTime!).getTime();
            const end = new Date(ev.end.dateTime!).getTime();

            // Find first column where this event fits
            let placedCol = -1;
            for (let i = 0; i < columns.length; i++) {
                if (columns[i] <= start) {
                    placedCol = i;
                    break;
                }
            }

            if (placedCol === -1) {
                placedCol = columns.length;
                columns.push(end);
            } else {
                columns[placedCol] = end;
            }

            result.push({ ...ev, colIndex: placedCol, totalCols: 1 }); // totalCols unused for overlay style
        });

        return result;
    };

    // Sort events: All-day first, then by time
    const sortedEvents = useMemo(() => {
        const allDay = events.filter(e => e.start.date);
        const timed = events.filter(e => e.start.dateTime);
        const processedTimed = processEvents(timed);
        return { allDay, timed: processedTimed };
    }, [events]);

    return (
        <div className="flex h-full bg-[#FAFAFA] text-slate-800 relative overflow-hidden">
            {/* Left Sidebar: Month View */}
            <div className="w-[320px] bg-white border-r border-slate-100 flex flex-col p-6 overflow-y-auto hidden md:flex shrink-0">
                <div className="flex items-center justify-between mb-6">
                    <h2 className="font-bold text-lg">{format(viewMonth, 'yyyy년 M월')}</h2>
                    <div className="flex gap-1">
                        <button onClick={handlePrevMonth} className="p-1 hover:bg-slate-50 rounded text-slate-400 hover:text-slate-700"><ChevronLeft size={20} /></button>
                        <button onClick={handleNextMonth} className="p-1 hover:bg-slate-50 rounded text-slate-400 hover:text-slate-700"><ChevronRight size={20} /></button>
                    </div>
                </div>

                {/* Weekday Headers */}
                <div className="grid grid-cols-7 mb-2 text-center text-xs text-slate-400 font-medium">
                    {['일', '월', '화', '수', '목', '금', '토'].map(d => (
                        <div key={d} className="py-1">{d}</div>
                    ))}
                </div>

                {/* Days Grid */}
                <div className="grid grid-cols-7 gap-y-1">
                    {daysInMonth.map((day, i) => {
                        const isSelected = isSameDay(day, currentDate);
                        const isCurrentMonth = isSameMonth(day, viewMonth);
                        const isTodayDate = isToday(day);

                        return (
                            <button
                                key={i}
                                onClick={() => handleDateClick(day)}
                                className={`
                                    h-9 w-9 rounded-full mx-auto flex items-center justify-center text-sm relative group transition-all
                                    ${!isCurrentMonth ? 'text-slate-300' : 'text-slate-700'}
                                    ${isSelected ? 'bg-black text-white shadow-md' : 'hover:bg-slate-50'}
                                    ${isTodayDate && !isSelected ? 'text-blue-500 font-bold' : ''}
                                `}
                            >
                                {format(day, 'd')}
                                {/* Dot indicator if potentially busy? (Complex to fetch all for month efficiently, skip for now) */}
                            </button>
                        );
                    })}
                </div>

                <div className="mt-8 border-t border-slate-100 pt-6">
                    <div className="flex items-center justify-between text-xs text-slate-400 mb-4">
                        <span>내 캘린더</span>
                    </div>
                    {/* Dummy Legend for now */}
                    <div className="space-y-3">
                        <div className="flex items-center gap-2 text-sm text-slate-600">
                            <div className="w-2.5 h-2.5 rounded bg-blue-500"></div>
                            <span>기본 캘린더</span>
                        </div>
                    </div>
                </div>
            </div>

            {/* Main Content: Daily Timeline */}
            <div className="flex-1 flex flex-col h-full min-w-0 transition-all">
                {/* Header */}
                <div className="h-16 border-b border-slate-100 flex items-center justify-between px-8 bg-white shrink-0">
                    <div className="flex items-center gap-4">
                        <div className="flex flex-col">
                            <h1 className="text-xl font-bold">{format(currentDate, 'M월 d일 EEEE', { locale: ko })}</h1>
                            <span className="text-xs text-slate-400">{format(currentDate, 'yyyy년')}</span>
                        </div>
                        <button
                            onClick={() => setCurrentDate(new Date())}
                            className="text-xs border border-slate-200 px-2 py-1 rounded hover:bg-slate-50 transition-colors"
                        >
                            오늘
                        </button>
                    </div>

                    <div className="flex items-center gap-2">
                        {loading && <Loader2 size={16} className="animate-spin text-slate-400" />}
                        {needsAuth && (
                            <button
                                onClick={handleConnectGoogle}
                                className="flex items-center gap-2 text-xs bg-blue-50 text-blue-600 px-3 py-1.5 rounded-lg hover:bg-blue-100 transition-colors font-semibold"
                            >
                                <RefreshCw size={12} /> 구글 캘린더 연동
                            </button>
                        )}
                        {error && (
                            <div className="text-xs text-red-500 bg-red-50 px-3 py-1.5 rounded flex items-center gap-2">
                                <span>⚠️ {error}</span>
                                {error.includes("Google Cloud Console") && (
                                    <a
                                        href="https://console.developers.google.com/apis/api/calendar-json.googleapis.com/overview"
                                        target="_blank"
                                        rel="noopener noreferrer"
                                        className="underline font-bold hover:text-red-700"
                                    >
                                        활성화하기
                                    </a>
                                )}
                            </div>
                        )}
                    </div>
                </div>

                {/* Timeline Body */}
                <div className="flex-1 overflow-y-auto relative bg-white">
                    {/* All Day Section */}
                    {sortedEvents.allDay.length > 0 && (
                        <div className="border-b border-slate-100 p-4 sticky top-0 bg-white z-10 shadow-sm">
                            <span className="text-xs font-semibold text-slate-400 block mb-2">종일</span>
                            <div className="flex flex-col gap-1">
                                {sortedEvents.allDay.map(ev => {
                                    const isLinkedTodo = ev.description?.includes('[할 일 문서]');
                                    return (
                                        <div
                                            key={ev.id}
                                            onClick={() => setSelectedEvent(ev)}
                                            className="bg-blue-50 text-blue-700 text-xs px-2 py-1 rounded border border-blue-100 font-medium cursor-pointer hover:bg-blue-100 transition-colors flex items-center gap-1"
                                        >
                                            {isLinkedTodo && <FileText size={10} className="shrink-0 opacity-70" />}
                                            <span className="truncate">{ev.summary}</span>
                                        </div>
                                    );
                                })}
                            </div>
                        </div>
                    )}

                    <div
                        className="relative min-h-[1440px] pt-4 select-none"
                        onMouseDown={handleMouseDown}
                        onMouseMove={handleMouseMove}
                        onMouseUp={handleMouseUp}
                    > {/* 24h * 60px = 1440px */}
                        {/* Time Grid */}
                        {hours.map(h => (
                            <div key={h} className="flex h-[60px] group border-b border-slate-50 last:border-0 relative">
                                {/* Time Label */}
                                <div className="w-16 text-right pr-4 text-xs text-slate-400 -mt-2.5 font-medium select-none">
                                    {h === 0 ? '' : `${h}:00`}
                                </div>
                                {/* Divider Line */}
                                <div className="flex-1 relative">
                                    <div className="absolute top-0 left-0 right-0 h-[1px] bg-slate-100 group-first:hidden"></div>
                                </div>
                            </div>
                        ))}

                        {/* Current Time Indicator */}
                        {isToday(currentDate) && (
                            <CurrentTimeIndicator />
                        )}

                        {/* Timed Events Layer */}
                        <div className="absolute top-4 left-16 right-4 bottom-0 pointer-events-none">
                            {/* Preview Block for Creation Mode */}
                            {isCreating && editForm.start?.dateTime && editForm.end?.dateTime && (() => {
                                const start = new Date(editForm.start.dateTime!);
                                const end = new Date(editForm.end.dateTime!);
                                if (isNaN(start.getTime()) || isNaN(end.getTime()) || !isSameDay(start, currentDate)) return null;

                                const startMinutes = start.getHours() * 60 + start.getMinutes();
                                const endMinutes = end.getHours() * 60 + end.getMinutes();
                                const duration = endMinutes - startMinutes;

                                return (
                                    <div
                                        className="absolute bg-blue-500/10 border-2 border-dashed border-blue-400 rounded z-[60] pointer-events-none flex items-center justify-center overflow-hidden transition-all duration-200"
                                        style={{
                                            top: `${startMinutes}px`,
                                            height: `${Math.max(duration, 15)}px`,
                                            left: '0%',
                                            width: '100%'
                                        }}
                                    >
                                        <div className="text-xs font-bold text-blue-600 bg-white/80 px-2 py-1 rounded shadow-sm">
                                            {editForm.summary || "새 일정"} ({format(start, 'HH:mm')} - {format(end, 'HH:mm')})
                                        </div>
                                    </div>
                                );
                            })()}

                            {/* Ghost Block for Drag-to-Create */}
                            {dragStart !== null && dragCurrent !== null && (
                                <div
                                    className="absolute bg-blue-500/20 border border-blue-500 rounded z-[70] pointer-events-none"
                                    style={{
                                        top: `${dragStart}px`,
                                        height: `${Math.max(dragCurrent - dragStart, 15)}px`,
                                        left: '0%',
                                        width: '100%'
                                    }}
                                >
                                    <div className="text-xs text-blue-700 px-2 py-1 font-bold">
                                        {format(new Date().setHours(Math.floor(dragStart / 60), dragStart % 60), "HH:mm")} - {format(new Date().setHours(Math.floor(Math.max(dragCurrent, dragStart + 15) / 60), Math.max(dragCurrent, dragStart + 15) % 60), "HH:mm")}
                                    </div>
                                </div>
                            )}
                            {sortedEvents.timed.map(ev => (
                                <TimeEventBlock
                                    key={ev.id}
                                    event={ev}
                                    onClick={() => setSelectedEvent(ev)}
                                    isSelected={selectedEvent?.id === ev.id}
                                />
                            ))}
                        </div>
                    </div>
                </div>
            </div>

            {/* Right Sidebar: Persistent Event Details / Edit */}
            <div className={`w-[380px] bg-white border-l border-slate-100 flex flex-col shrink-0 z-40 transition-all ${(selectedEvent || isCreating) ? '' : 'bg-slate-50/30'}`}>
                {(selectedEvent || isCreating) ? (
                    <>
                        {/* Minimal Header */}
                        <div className="h-12 px-4 flex items-center justify-between border-b border-slate-50">
                            <span className="text-xs font-medium text-slate-400 uppercase tracking-wide">
                                {isCreating ? '새 일정' : (isEditing ? '수정' : '상세')}
                            </span>
                            <button
                                onClick={() => { setSelectedEvent(null); setIsEditing(false); setIsCreating(false); setIsImporting(false); }}
                                className="w-7 h-7 flex items-center justify-center hover:bg-slate-100 rounded transition-colors text-slate-400 hover:text-slate-600"
                            >
                                <X size={16} />
                            </button>
                        </div>

                        <div className="flex-1 overflow-y-auto">
                            {(isEditing || isCreating) ? (
                                // Edit / Create Form - Notion Style
                                <div className="p-5 flex flex-col h-full">
                                    {/* Title Input - Large & Clean */}
                                    <input
                                        type="text"
                                        value={editForm.summary || ""}
                                        onChange={e => setEditForm({ ...editForm, summary: e.target.value })}
                                        className="w-full text-2xl font-bold text-slate-800 border-none px-0 py-1 focus:ring-0 placeholder:text-slate-300 bg-transparent outline-none shrink-0 mb-5"
                                        placeholder="제목"
                                        autoFocus
                                    />

                                    {/* Properties - Notion Style */}
                                    <div className="space-y-1 -mx-2 shrink-0">
                                        {/* Date/Time */}
                                        <div className="flex items-center gap-2 px-2 py-2 rounded-md hover:bg-slate-50 group transition-colors">
                                            <Clock size={14} className="text-slate-400 shrink-0" />
                                            <span className="text-sm text-slate-500 w-14 shrink-0">일시</span>
                                            <div className="flex-1 flex flex-col text-sm text-slate-700">
                                                <input
                                                    type="datetime-local"
                                                    value={toLocalISOString(editForm.start?.dateTime)}
                                                    onChange={e => handleDateChange('start', e.target.value)}
                                                    className="bg-transparent border-none p-0 focus:ring-0 outline-none cursor-pointer text-sm"
                                                />
                                                <input
                                                    type="datetime-local"
                                                    value={toLocalISOString(editForm.end?.dateTime)}
                                                    onChange={e => handleDateChange('end', e.target.value)}
                                                    className="bg-transparent border-none p-0 focus:ring-0 outline-none cursor-pointer text-sm text-slate-500"
                                                />
                                            </div>
                                        </div>

                                        {/* Location */}
                                        <div className="flex items-center gap-2 px-2 py-2 rounded-md hover:bg-slate-50 group transition-colors">
                                            <MapPin size={14} className="text-slate-400 shrink-0" />
                                            <span className="text-sm text-slate-500 w-14 shrink-0">위치</span>
                                            <input
                                                type="text"
                                                value={editForm.location || ""}
                                                onChange={e => setEditForm({ ...editForm, location: e.target.value })}
                                                className="flex-1 text-sm text-slate-700 bg-transparent border-none p-0 focus:ring-0 outline-none placeholder:text-slate-400"
                                                placeholder="추가..."
                                            />
                                        </div>

                                        {/* Description */}
                                        <div className="flex items-start gap-2 px-2 py-2 rounded-md hover:bg-slate-50 group transition-colors">
                                            <AlignLeft size={14} className="text-slate-400 shrink-0 mt-0.5" />
                                            <span className="text-sm text-slate-500 w-14 shrink-0">설명</span>
                                            <textarea
                                                value={editForm.description || ""}
                                                onChange={e => setEditForm({ ...editForm, description: e.target.value })}
                                                className="flex-1 text-sm text-slate-700 bg-transparent border-none p-0 focus:ring-0 outline-none placeholder:text-slate-400 min-h-[80px] resize-none leading-relaxed"
                                                placeholder="추가..."
                                            />
                                        </div>
                                    </div>

                                    {/* Footer Actions */}
                                    <div className="flex items-center justify-between pt-6 border-t border-slate-50 shrink-0 mt-5">
                                        <button
                                            onClick={() => setIsImporting(!isImporting)}
                                            className={`flex items-center gap-2 px-3 py-2 text-xs font-medium rounded-lg transition-colors ${isImporting ? 'bg-blue-50 text-blue-600' : 'text-slate-500 hover:bg-slate-50'}`}
                                            title="내 할 일에서 가져오기"
                                        >
                                            <ListTodo size={14} />
                                            <span>할 일 가져오기</span>
                                        </button>

                                        <div className="flex items-center gap-2">
                                            <button
                                                onClick={() => { setIsEditing(false); setIsCreating(false); setIsImporting(false); }}
                                                disabled={isSaving}
                                                className="px-4 py-2 text-sm font-medium text-slate-500 hover:text-slate-800 hover:bg-slate-100 rounded-lg transition-colors"
                                            >
                                                취소
                                            </button>
                                            <button
                                                onClick={handleSaveEvent}
                                                disabled={isSaving}
                                                className="px-4 py-2 text-sm font-medium text-white bg-slate-900 hover:bg-slate-800 rounded-lg shadow-sm transition-colors disabled:opacity-50"
                                            >
                                                {isSaving ? "저장 중..." : "완료"}
                                            </button>
                                        </div>
                                    </div>

                                    {/* Todo Import Panel */}
                                    {isImporting && (
                                        <div className="mt-4 border-t border-slate-100 pt-4 flex-1 flex flex-col min-h-0">
                                            <h3 className="text-xs font-bold text-slate-500 mb-3 px-1 shrink-0">내 할 일 목록 (진행 중)</h3>
                                            <div className="space-y-2 flex-1 overflow-y-auto pr-1 custom-scrollbar">
                                                {isLoadingTodos ? (
                                                    <div className="flex justify-center py-4"><Loader2 className="animate-spin text-slate-300" size={16} /></div>
                                                ) : availableTodos.length === 0 ? (
                                                    <div className="text-center py-4 text-xs text-slate-400">가져올 할 일이 없습니다.</div>
                                                ) : (
                                                    availableTodos.map(todo => (
                                                        <button
                                                            key={todo.id}
                                                            onClick={() => {
                                                                setEditForm(prev => ({
                                                                    ...prev,
                                                                    summary: todo.title,
                                                                    description: (todo.description || todo.title) + `\n\n[할 일 문서](/todos/${todo.id})`
                                                                }));
                                                                setPendingTodoId(todo.id);
                                                                setIsImporting(false);
                                                            }}
                                                            className="w-full text-left p-3 rounded-lg border border-slate-200 hover:border-blue-300 hover:bg-blue-50 transition-all group"
                                                        >
                                                            <div className="text-sm font-medium text-slate-700 group-hover:text-blue-700 mb-0.5 truncate">{todo.title}</div>
                                                            {todo.description && <div className="text-xs text-slate-400 truncate">{todo.description}</div>}
                                                        </button>
                                                    ))
                                                )}
                                            </div>
                                        </div>
                                    )}
                                </div>
                            ) : selectedEvent ? (
                                // View Mode - Notion Style
                                <div className="p-5 space-y-4">
                                    {/* Title & Time */}
                                    <div>
                                        <h3 className="text-xl font-bold text-slate-800 leading-tight">{selectedEvent.summary || '(제목 없음)'}</h3>
                                        <p className="text-sm text-slate-500 mt-1">
                                            {selectedEvent.start.date
                                                ? '종일'
                                                : `${format(new Date(selectedEvent.start.dateTime!), 'M월 d일 (E) a h:mm', { locale: ko })} ~ ${format(new Date(selectedEvent.end.dateTime!), 'a h:mm', { locale: ko })}`
                                            }
                                        </p>
                                    </div>

                                    {/* Properties List */}
                                    <div className="space-y-1 -mx-2">
                                        {/* Location */}
                                        {selectedEvent.location && (
                                            <div className="flex items-center gap-2 px-2 py-2 rounded-md text-sm">
                                                <MapPin size={14} className="text-slate-400 shrink-0" />
                                                <span className="text-slate-500 w-14 shrink-0">위치</span>
                                                <span className="text-slate-700 flex-1">{selectedEvent.location}</span>
                                            </div>
                                        )}

                                        {/* Todo Link (if any) */}
                                        {selectedEvent.description?.includes('[할 일 문서]') && (() => {
                                            const match = selectedEvent.description?.match(/\[할 일 문서\]\((.*?)\)/);
                                            if (!match) return null;
                                            return (
                                                <a
                                                    href={match[1]}
                                                    className="flex items-center gap-2 px-2 py-2 rounded-md text-sm hover:bg-slate-50 transition-colors"
                                                >
                                                    <FileText size={14} className="text-blue-500 shrink-0" />
                                                    <span className="text-slate-500 w-14 shrink-0">연결</span>
                                                    <span className="text-blue-600 flex-1 font-medium">할 일 문서 보러가기 →</span>
                                                </a>
                                            );
                                        })()}
                                    </div>

                                    {/* Description */}
                                    {selectedEvent.description && (() => {
                                        const desc = selectedEvent.description || "";
                                        const cleanDesc = desc.replace(/\[할 일 문서\]\(.*?\)/, "").trim();
                                        if (!cleanDesc) return null;
                                        return (
                                            <div className="bg-slate-50/70 p-3 rounded-lg text-sm text-slate-600 whitespace-pre-wrap leading-relaxed">
                                                {cleanDesc}
                                            </div>
                                        );
                                    })()}

                                    {/* Actions */}
                                    <div className="pt-4 flex gap-2">
                                        <button
                                            onClick={handleStartEdit}
                                            className="flex-1 py-2 rounded-lg bg-slate-100 hover:bg-slate-200 text-sm font-medium text-slate-700 transition-colors"
                                        >
                                            수정
                                        </button>
                                        <button
                                            onClick={handleDeleteEvent}
                                            disabled={isSaving}
                                            className="w-10 h-10 flex items-center justify-center rounded-lg hover:bg-red-50 text-slate-400 hover:text-red-500 transition-colors"
                                        >
                                            <Trash2 size={16} />
                                        </button>
                                    </div>

                                    {/* Google Calendar Link */}
                                    {selectedEvent.htmlLink && (
                                        <a
                                            href={selectedEvent.htmlLink}
                                            target="_blank"
                                            rel="noopener noreferrer"
                                            className="block text-center text-xs text-slate-400 hover:text-blue-500 transition-colors"
                                        >
                                            Google 캘린더에서 열기 ↗
                                        </a>
                                    )}
                                </div>
                            ) : null}
                        </div>
                    </>
                ) : (
                    // Empty State
                    <div className="flex flex-col items-center justify-center h-full text-slate-400 p-8 text-center select-none">
                        <CalendarIcon size={48} className="mb-4 opacity-20" />
                        <p className="text-sm">타임라인을 드래그하여<br />새 일정을 만드세요.</p>
                        <button
                            onClick={() => {
                                const start = new Date(currentDate);
                                start.setHours(9, 0, 0, 0); // Default 9 AM
                                const end = new Date(currentDate);
                                end.setHours(10, 0, 0, 0);
                                setEditForm({
                                    summary: "",
                                    start: { dateTime: start.toISOString() },
                                    end: { dateTime: end.toISOString() }
                                });
                                setIsCreating(true);
                                setSelectedEvent(null);
                            }}
                            className="mt-6 text-xs text-blue-500 font-bold hover:underline"
                        >
                            + 직접 만들기
                        </button>
                    </div>
                )}
            </div>
        </div >
    );
};

// Sub-component for Current Time Line
const CurrentTimeIndicator = () => {
    const [now, setNow] = useState(new Date());
    useEffect(() => {
        const timer = setInterval(() => setNow(new Date()), 60000); // Update every min
        return () => clearInterval(timer);
    }, []);

    const minutes = now.getHours() * 60 + now.getMinutes();
    const top = minutes; // 1 min = 1px height (60px/hr)

    return (
        <div
            className="absolute left-16 right-0 z-20 pointer-events-none"
            style={{ top: `${top}px` }}
        >
            {/* Circle aligned with line */}
            <div className="absolute -left-1 top-1/2 -translate-y-1/2 w-2.5 h-2.5 bg-red-500 rounded-full"></div>
            {/* Line */}
            <div className="h-[2px] bg-red-500 w-full"></div>
        </div>
    );
};

// Sub-component for Event Block
const TimeEventBlock = ({
    event,
    onClick,
    isSelected
}: {
    event: CalendarEvent & { colIndex?: number; totalCols?: number },
    onClick?: () => void,
    isSelected?: boolean
}) => {
    if (!event.start.dateTime || !event.end.dateTime) return null;

    const start = new Date(event.start.dateTime);
    const end = new Date(event.end.dateTime);

    // Safety check for invalid dates
    if (isNaN(start.getTime()) || isNaN(end.getTime())) return null;

    const startMinutes = start.getHours() * 60 + start.getMinutes();
    const endMinutes = end.getHours() * 60 + end.getMinutes();
    const duration = Math.max(endMinutes - startMinutes, 15); // Min 15m display

    // Color logic
    const styles = [
        "bg-blue-50/90 text-blue-700 border-blue-200",
        "bg-emerald-50/90 text-emerald-700 border-emerald-200",
        "bg-violet-50/90 text-violet-700 border-violet-200",
        "bg-orange-50/90 text-orange-700 border-orange-200",
        "bg-rose-50/90 text-rose-700 border-rose-200",
    ];
    // Hash id
    const colorIndex = (event.id.charCodeAt(0) + (event.id.charCodeAt(event.id.length - 1) || 0)) % styles.length;
    const colorClass = event.colorId ? styles[0] : styles[colorIndex];

    // Layout styles: Greedy Overlay
    // colIndex 0 = bottom, widest.
    // colIndex 1 = on top, narrower.
    const colIndex = event.colIndex || 0;

    // Config: How much to shrink/indent per level?
    // Cap indent at 60% so events don't become invisible if deeply stacked (e.g. 5+ levels)
    const rawIndent = colIndex * 15;
    const indentPercent = Math.min(rawIndent, 60);

    // Check for Todo Link
    const isLinkedTodo = event.description?.includes('[할 일 문서]');

    // Width is full remaining width relative to its 'start' (which is just indent).
    // Or rather: Left = indent. Width = 100 - indent.

    return (
        <div
            onClick={(e) => {
                e.stopPropagation(); // Prevent trigger from parent
                onClick?.();
            }}
            className={`absolute rounded-md border text-xs overflow-hidden hover:z-[60] hover:shadow-xl transition-all cursor-pointer pointer-events-auto flex flex-col px-2 py-1 ${colorClass} ${isSelected ? 'ring-2 ring-offset-1 ring-blue-500 z-[60] shadow-lg' : ''}`}
            style={{
                top: `${startMinutes}px`,
                height: `${duration}px`,
                left: `${indentPercent}%`,
                width: `${100 - indentPercent}%`,
                zIndex: isSelected ? 60 : 10 + colIndex,
                boxShadow: (colIndex > 0 || isSelected) ? '0 4px 6px -1px rgba(0, 0, 0, 0.1), 0 2px 4px -1px rgba(0, 0, 0, 0.06)' : 'none'
            }}
            title={`${event.summary}\n${format(start, 'HH:mm')} - ${format(end, 'HH:mm')}`}
        >
            <div className="font-semibold truncate leading-tight flex items-center gap-1">
                {isLinkedTodo && <FileText size={10} className="shrink-0 opacity-70" />}
                <span className="truncate">{event.summary || '(제목 없음)'}</span>
            </div>
            {duration > 30 && (
                <div className="opacity-80 text-[10px] truncate mt-0.5">
                    {format(start, 'HH:mm')} - {format(end, 'HH:mm')}
                </div>
            )}
        </div>
    );
};

export default CalendarPage;
