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
import { ChevronLeft, ChevronRight, Calendar as CalendarIcon, Loader2, RefreshCw, X, Clock, MapPin, AlignLeft, Trash2, ListTodo, FileText, Users, CheckCircle2, XCircle, HelpCircle } from "lucide-react";

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
    calendarId?: string; // Added for multi-calendar support
    attendees?: {
        email: string;
        responseStatus?: string;
        self?: boolean;
        displayName?: string;
        nickname?: string;
        name?: string;
        avatarUrl?: string; // Fetched from Supabase
    }[];
}

interface CalendarInfo {
    id: string;
    summary: string;
    description?: string;
    backgroundColor?: string;
    foregroundColor?: string;
    primary: boolean;
    accessRole: string;
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

    // Multi-calendar State
    const [availableCalendars, setAvailableCalendars] = useState<CalendarInfo[]>([]);
    const [selectedCalendarIds, setSelectedCalendarIds] = useState<string[]>(['primary']);
    const [showCalendarSelector, setShowCalendarSelector] = useState(false);

    // Edit & Create State
    const [isEditing, setIsEditing] = useState(false);
    const [isCreating, setIsCreating] = useState(false);
    const [editForm, setEditForm] = useState<Partial<CalendarEvent>>({});
    const [isSaving, setIsSaving] = useState(false);

    // Drag Interaction State
    const [dragStart, setDragStart] = useState<number | null>(null);
    const [dragCurrent, setDragCurrent] = useState<number | null>(null);

    // Hover Interaction State
    const [hoveredEventId, setHoveredEventId] = useState<string | null>(null);

    // Attendee Search State
    const [searchResults, setSearchResults] = useState<any[]>([]); // simplified type
    const [isSearching, setIsSearching] = useState(false);
    const [showSuggestions, setShowSuggestions] = useState(false);
    const [newAttendeeEmail, setNewAttendeeEmail] = useState("");
    const [currentUserEmail, setCurrentUserEmail] = useState<string | null>(null);
    const [isAttendeeInputFocused, setIsAttendeeInputFocused] = useState(false);

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

    // Fetch Current User Email
    useEffect(() => {
        const fetchUser = async () => {
            const { data: { user } } = await supabase.auth.getUser();
            if (user?.email) {
                setCurrentUserEmail(user.email);
            }
        };
        fetchUser();
    }, [supabase]);

    // Search Users
    useEffect(() => {
        const searchUsers = async () => {
            let query = supabase
                .from('profiles')
                .select('*')
                .limit(20);

            if (newAttendeeEmail && newAttendeeEmail.trim().length > 0) {
                query = query.or(`email.ilike.%${newAttendeeEmail}%,name.ilike.%${newAttendeeEmail}%,nickname.ilike.%${newAttendeeEmail}%`);
            }

            setIsSearching(true);
            try {
                const { data, error } = await query;

                if (data) {
                    setSearchResults(data);
                    setShowSuggestions(true);
                }
            } catch (err) {
                console.error("Failed to search profiles", err);
            } finally {
                setIsSearching(false);
            }
        };

        const timer = setTimeout(searchUsers, 300); // 300ms debounce
        return () => clearTimeout(timer);
    }, [newAttendeeEmail, supabase]);

    // Fetch available calendars on mount
    useEffect(() => {
        const fetchCalendarList = async () => {
            try {
                const res = await fetch('/api/calendar/list');
                if (res.ok) {
                    const data = await res.json();
                    setAvailableCalendars(data);
                    // Initially select primary calendar
                    const primaryCal = data.find((c: CalendarInfo) => c.primary);
                    if (primaryCal) {
                        setSelectedCalendarIds([primaryCal.id]);
                    }
                } else {
                    const err = await res.json();
                    if (res.status === 401 || res.status === 403 || err.error?.includes("insufficient")) {
                        setNeedsAuth(true);
                    }
                }
            } catch (e) {
                console.error('Failed to fetch calendar list:', e);
            }
        };
        fetchCalendarList();
    }, [refreshKey]);

    // Fetch Events for the selected day
    useEffect(() => {
        const fetchEvents = async () => {
            setLoading(true);
            setError(null);

            // Fetch for the whole day (00:00 to 23:59:59)
            const timeMin = startOfDay(currentDate).toISOString();
            const timeMax = endOfDay(currentDate).toISOString();

            try {
                // Build calendarIdsParam
                const calendarIdsParam = selectedCalendarIds.join(',');
                const res = await fetch(`/api/calendar/events?timeMin=${timeMin}&timeMax=${timeMax}&calendarIds=${encodeURIComponent(calendarIdsParam)}`, {
                    cache: 'no-store'
                });

                if (res.ok) {
                    const data = await res.json();

                    // Enrich attendee data with Supabase profile information
                    const enrichedData = await Promise.all(
                        data.map(async (event: CalendarEvent) => {
                            if (!event.attendees || event.attendees.length === 0) {
                                return event;
                            }

                            const enrichedAttendees = await Promise.all(
                                event.attendees.map(async (att) => {
                                    try {
                                        const { data: profile } = await supabase
                                            .from('profiles')
                                            .select('nickname, name, avatar_url')
                                            .eq('email', att.email)
                                            .single();

                                        if (profile) {
                                            return {
                                                ...att,
                                                nickname: profile.nickname,
                                                name: profile.name,
                                                avatarUrl: profile.avatar_url || att.avatarUrl
                                            };
                                        }
                                    } catch (err) {
                                        // Profile not found, keep original data
                                    }
                                    return att;
                                })
                            );

                            return {
                                ...event,
                                attendees: enrichedAttendees
                            };
                        })
                    );

                    setEvents(enrichedData);

                    // Update selected event reference if it exists in new data
                    if (selectedEvent) {
                        const updated = enrichedData.find((e: CalendarEvent) => e.id === selectedEvent.id);
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
    }, [currentDate, refreshKey, selectedCalendarIds]);

    // Auto-refresh: Poll for updates every 60 seconds
    useEffect(() => {
        const interval = setInterval(() => {
            console.log('[Auto-refresh] Refreshing calendar events...');
            setRefreshKey(prev => prev + 1);
        }, 60000); // 60 seconds

        return () => clearInterval(interval);
    }, []); // Empty deps: set up once on mount

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
                scopes: 'https://www.googleapis.com/auth/calendar https://www.googleapis.com/auth/drive.file' // Full calendar access + drive
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
            end: selectedEvent.end,
            attendees: selectedEvent.attendees ? selectedEvent.attendees.map(a => ({ ...a })) : []
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
                    ...editForm,
                    attendees: editForm.attendees?.map(a => ({
                        email: a.email,
                        responseStatus: a.responseStatus || 'needsAction'
                    }))
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
                    end: editForm.end,
                    attendees: editForm.attendees?.map(a => ({
                        email: a.email,
                        responseStatus: 'needsAction'
                    }))
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

    // RSVP Handler (Optimistic UI)
    const handleRSVP = async (status: string) => {
        if (!selectedEvent) return;

        // 1. Snapshot previous state for rollback
        const previousSelectedEvent = { ...selectedEvent };
        const previousEvents = [...events];

        // 2. Optimistic Update
        const updateEventState = (eventToUpdate: CalendarEvent) => ({
            ...eventToUpdate,
            attendees: eventToUpdate.attendees?.map(att =>
                att.self ? { ...att, responseStatus: status } : att
            )
        });

        const optimisticallyUpdatedEvent = updateEventState(selectedEvent);

        // Update UI immediately
        setSelectedEvent(optimisticallyUpdatedEvent);
        setEvents(prev => prev.map(e =>
            e.id === selectedEvent.id ? optimisticallyUpdatedEvent : e
        ));

        // 3. Background Request
        try {
            const res = await fetch('/api/calendar/events/rsvp', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    calendarId: selectedEvent.calendarId || 'primary',
                    eventId: selectedEvent.id,
                    responseStatus: status
                })
            });

            if (!res.ok) {
                const err = await res.json();
                throw new Error(err.error || "Update failed");
            }
            // Success: State is already consistent. 
            // We can optionally silent-refresh or just leave it.
        } catch (e: any) {
            console.error(e);
            alert("상태 업데이트 실패. 원래 상태로 되돌립니다.\n" + e.message);
            // 4. Rollback on failure
            setSelectedEvent(previousSelectedEvent);
            setEvents(previousEvents);
        }
    };


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
                    {/* Calendar Selector */}
                    <div className="space-y-2">
                        <h3 className="text-xs font-semibold text-slate-500 uppercase tracking-wide">캘린더</h3>
                        {availableCalendars.length === 0 ? (
                            <div className="text-xs text-slate-400">캘린더를 불러오는 중...</div>
                        ) : (
                            <div className="space-y-1.5">
                                {availableCalendars.map(cal => (
                                    <label
                                        key={cal.id}
                                        className="flex items-center gap-2 text-sm cursor-pointer hover:bg-slate-50 px-2 py-1.5 -mx-2 rounded transition-colors"
                                    >
                                        <input
                                            type="checkbox"
                                            checked={selectedCalendarIds.includes(cal.id)}
                                            onChange={(e) => {
                                                if (e.target.checked) {
                                                    setSelectedCalendarIds(prev => [...prev, cal.id]);
                                                } else {
                                                    setSelectedCalendarIds(prev => prev.filter(id => id !== cal.id));
                                                }
                                            }}
                                            className="rounded border-slate-300 text-blue-500 focus:ring-blue-500 focus:ring-offset-0"
                                        />
                                        <div
                                            className="w-2.5 h-2.5 rounded shrink-0"
                                            style={{ backgroundColor: cal.backgroundColor || '#3b82f6' }}
                                        />
                                        <span className="truncate text-slate-600">{cal.summary}</span>
                                        {cal.primary && <span className="text-[10px] text-slate-400">(기본)</span>}
                                    </label>
                                ))}
                            </div>
                        )}
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
                                    isHovered={hoveredEventId === ev.id}
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

                                    {/* Attendees Management */}
                                    <div className="mt-4 border-t border-slate-100 pt-3 px-1">
                                        <div className="flex items-center gap-2 mb-2">
                                            <Users size={14} className="text-slate-400" />
                                            <span className="text-xs font-semibold text-slate-500">참석자</span>
                                        </div>

                                        {/* List Existing */}
                                        <div className="space-y-1 mb-2">
                                            {editForm.attendees?.map((att, i) => {
                                                const name = att.displayName || att.email.split('@')[0] || '?';
                                                const initial = name.charAt(0).toUpperCase();
                                                const colorHash = name.split('').reduce((acc, char) => acc + char.charCodeAt(0), 0);
                                                const bg = AVATAR_COLORS[colorHash % AVATAR_COLORS.length];

                                                return (
                                                    <div key={i} className="flex items-center justify-between gap-2 group/att px-2 py-1.5 hover:bg-slate-50 rounded overflow-hidden">
                                                        <div className="flex items-center gap-2 min-w-0 flex-1 overflow-hidden">
                                                            {/* Avatar */}
                                                            <div className="w-7 h-7 rounded-full overflow-hidden shrink-0 border border-slate-100 bg-slate-100 flex items-center justify-center">
                                                                {att.avatarUrl ? (
                                                                    <img src={att.avatarUrl} alt={name} className="w-full h-full object-cover" />
                                                                ) : (
                                                                    <span className={`text-xs font-bold text-slate-700 ${bg}`}>
                                                                        {initial}
                                                                    </span>
                                                                )}
                                                            </div>
                                                            {/* Info */}
                                                            <div className="flex flex-col min-w-0 flex-1 overflow-hidden">
                                                                <span className="text-sm font-medium text-slate-700 truncate">
                                                                    {att.nickname || att.name || att.email.split('@')[0]}
                                                                </span>
                                                                <span className="text-xs text-slate-400 truncate">
                                                                    {att.nickname && att.name && `${att.name} · `}{att.email}
                                                                </span>
                                                            </div>
                                                        </div>
                                                        {/* Remove Button */}
                                                        <button
                                                            onClick={() => {
                                                                const newAttendees = editForm.attendees?.filter((_, idx) => idx !== i);
                                                                setEditForm({ ...editForm, attendees: newAttendees });
                                                            }}
                                                            className="text-slate-300 hover:text-red-500 opacity-0 group-hover/att:opacity-100 transition-opacity shrink-0"
                                                        >
                                                            <X size={14} />
                                                        </button>
                                                    </div>
                                                );
                                            })}
                                        </div>

                                        {/* Add New */}
                                        <div className="relative z-50">
                                            <div className="flex items-center gap-2 px-2">
                                                <input
                                                    type="email"
                                                    placeholder="이메일 추가..."
                                                    className="flex-1 text-sm bg-transparent border-b border-slate-200 focus:border-blue-500 outline-none py-1 placeholder:text-slate-300"
                                                    value={newAttendeeEmail}
                                                    onChange={e => setNewAttendeeEmail(e.target.value)}
                                                    onFocus={() => setIsAttendeeInputFocused(true)}
                                                    onBlur={() => setTimeout(() => setIsAttendeeInputFocused(false), 200)}
                                                    onKeyDown={e => {
                                                        if (e.key === 'Enter') {
                                                            e.preventDefault();
                                                            if (newAttendeeEmail && newAttendeeEmail.includes('@')) {
                                                                const updatedAttendees = [...(editForm.attendees || [])];

                                                                // If list is empty and we have current user email, add self first
                                                                if (updatedAttendees.length === 0 && currentUserEmail) {
                                                                    updatedAttendees.push({ email: currentUserEmail, responseStatus: 'accepted', self: true });
                                                                }

                                                                // Prevent duplicate addition
                                                                if (!updatedAttendees.some(a => a.email.toLowerCase() === newAttendeeEmail.toLowerCase())) {
                                                                    updatedAttendees.push({ email: newAttendeeEmail });
                                                                }

                                                                setEditForm({
                                                                    ...editForm,
                                                                    attendees: updatedAttendees
                                                                });
                                                                setNewAttendeeEmail("");
                                                            }
                                                        }
                                                    }}
                                                />
                                                <button
                                                    onClick={() => {
                                                        if (newAttendeeEmail && newAttendeeEmail.includes('@')) {
                                                            const updatedAttendees = [...(editForm.attendees || [])];

                                                            // If list is empty and we have current user email, add self first
                                                            if (updatedAttendees.length === 0 && currentUserEmail) {
                                                                updatedAttendees.push({ email: currentUserEmail, responseStatus: 'accepted', self: true });
                                                            }

                                                            // Prevent duplicate addition
                                                            if (!updatedAttendees.some(a => a.email.toLowerCase() === newAttendeeEmail.toLowerCase())) {
                                                                updatedAttendees.push({ email: newAttendeeEmail });
                                                            }

                                                            setEditForm({
                                                                ...editForm,
                                                                attendees: updatedAttendees
                                                            });
                                                            setNewAttendeeEmail("");
                                                        }
                                                    }}
                                                    className="text-xs text-blue-500 hover:text-blue-600 font-medium px-2"
                                                >
                                                    추가
                                                </button>


                                                {isAttendeeInputFocused && showSuggestions && searchResults.length > 0 && (
                                                    <div className="absolute left-0 right-0 top-full mt-1 bg-white border border-slate-200 rounded-lg shadow-lg overflow-hidden z-50 max-h-60 overflow-y-auto">
                                                        {searchResults.map((profile) => (
                                                            <button
                                                                key={profile.id}
                                                                className="w-full text-left px-3 py-2 hover:bg-slate-50 flex items-center gap-3 transition-colors border-b border-slate-50 last:border-none"
                                                                onClick={() => {
                                                                    const updatedAttendees = [...(editForm.attendees || [])];

                                                                    // If list is empty and we have current user email, add self first
                                                                    if (updatedAttendees.length === 0 && currentUserEmail) {
                                                                        updatedAttendees.push({ email: currentUserEmail, responseStatus: 'accepted', self: true });
                                                                    }

                                                                    // Prevent duplicate addition
                                                                    if (!updatedAttendees.some(a => a.email.toLowerCase() === profile.email.toLowerCase())) {
                                                                        updatedAttendees.push({
                                                                            email: profile.email,
                                                                            displayName: profile.nickname || profile.name,
                                                                            nickname: profile.nickname,
                                                                            name: profile.name,
                                                                            avatarUrl: profile.avatar_url
                                                                        });
                                                                    }

                                                                    setEditForm({
                                                                        ...editForm,
                                                                        attendees: updatedAttendees
                                                                    });
                                                                    setNewAttendeeEmail("");
                                                                    setSearchResults([]);
                                                                    setShowSuggestions(false);
                                                                }}
                                                            >
                                                                {/* Avatar */}
                                                                <div className="w-8 h-8 rounded-full overflow-hidden shrink-0 border border-slate-100 bg-slate-100 flex items-center justify-center">
                                                                    {profile.avatar_url ? (
                                                                        <img src={profile.avatar_url} alt={profile.name} className="w-full h-full object-cover" />
                                                                    ) : (
                                                                        <span className="text-xs font-bold text-slate-400">
                                                                            {(profile.nickname || profile.name || '?').charAt(0).toUpperCase()}
                                                                        </span>
                                                                    )}
                                                                </div>
                                                                {/* Info */}
                                                                <div className="flex flex-col min-w-0">
                                                                    <div className="flex items-center gap-1.5">
                                                                        <span className="text-sm font-medium text-slate-700 truncate">
                                                                            {profile.nickname || profile.name}
                                                                        </span>
                                                                        {profile.nickname && profile.name && (
                                                                            <span className="text-xs text-slate-400">({profile.name})</span>
                                                                        )}
                                                                    </div>
                                                                    <span className="text-xs text-slate-400 truncate">{profile.email}</span>
                                                                </div>
                                                            </button>
                                                        ))}
                                                    </div>
                                                )}
                                            </div>
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

                                        {/* Attendees */}
                                        {selectedEvent.attendees && selectedEvent.attendees.length > 0 && (
                                            <div className="flex items-start gap-2 px-2 py-2 rounded-md hover:bg-slate-50 group transition-colors overflow-hidden">
                                                <Users size={14} className="text-slate-400 shrink-0 mt-1" />
                                                <span className="text-sm text-slate-500 w-14 shrink-0 mt-0.5">참석자</span>
                                                <div className="flex-1 space-y-2 min-w-0 overflow-hidden">
                                                    {selectedEvent.attendees.map((att, i) => {
                                                        const status = att.responseStatus;
                                                        const isAccepted = status === 'accepted';
                                                        const isDeclined = status === 'declined';
                                                        const isNeedsAction = status === 'needsAction' || status === 'tentative';

                                                        const name = att.displayName || att.email.split('@')[0];
                                                        const initial = name.charAt(0).toUpperCase();

                                                        return (
                                                            <div key={i} className="flex items-center justify-between text-sm overflow-hidden">
                                                                <div className="flex items-center gap-2 min-w-0 flex-1 overflow-hidden">
                                                                    {att.avatarUrl ? (
                                                                        <img src={att.avatarUrl} alt={name} className="w-6 h-6 rounded-full object-cover bg-slate-100 shrink-0" />
                                                                    ) : (
                                                                        <div className={`w-6 h-6 rounded-full flex items-center justify-center text-[9px] font-bold text-slate-700 shrink-0 ${AVATAR_COLORS[(name.charCodeAt(0) || 0) % AVATAR_COLORS.length]}`}>
                                                                            {initial}
                                                                        </div>
                                                                    )}
                                                                    <div className="flex flex-col min-w-0 flex-1 overflow-hidden">
                                                                        <span className="truncate text-slate-700 font-medium text-sm">
                                                                            {att.nickname || att.name || att.email.split('@')[0]}
                                                                        </span>
                                                                        <span className="truncate text-slate-400 text-xs">
                                                                            {att.nickname && att.name && `${att.name} · `}{att.email}
                                                                        </span>
                                                                    </div>
                                                                </div>
                                                                <div className="shrink-0 ml-2" title={status}>
                                                                    {att.self ? (
                                                                        <div className="flex items-center gap-1">
                                                                            <button onClick={() => handleRSVP('accepted')} className={`p-1 rounded-full hover:bg-slate-100 transition-colors ${status === 'accepted' ? 'text-green-600 bg-green-50' : 'text-slate-300'}`} title="수락">
                                                                                <CheckCircle2 size={16} />
                                                                            </button>
                                                                            <button onClick={() => handleRSVP('declined')} className={`p-1 rounded-full hover:bg-slate-100 transition-colors ${status === 'declined' ? 'text-red-600 bg-red-50' : 'text-slate-300'}`} title="거절">
                                                                                <XCircle size={16} />
                                                                            </button>
                                                                            <button onClick={() => handleRSVP('tentative')} className={`p-1 rounded-full hover:bg-slate-100 transition-colors ${status === 'tentative' ? 'text-slate-600 bg-slate-100' : 'text-slate-300'}`} title="미정">
                                                                                <HelpCircle size={16} />
                                                                            </button>
                                                                        </div>
                                                                    ) : (
                                                                        <>
                                                                            {isAccepted && <CheckCircle2 size={14} className="text-green-500" />}
                                                                            {isDeclined && <XCircle size={14} className="text-red-500" />}
                                                                            {(isNeedsAction || !status) && <HelpCircle size={14} className="text-slate-300" />}
                                                                        </>
                                                                    )}
                                                                </div>
                                                            </div>
                                                        );
                                                    })}
                                                </div>
                                            </div>
                                        )}
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
                    // Daily Summary View
                    <div className="flex flex-col h-full">
                        {/* Header */}
                        <div className="h-12 px-4 flex items-center justify-between border-b border-slate-50 shrink-0">
                            <span className="text-xs font-medium text-slate-400 uppercase tracking-wide">오늘 일정</span>
                        </div>

                        <div className="flex-1 overflow-y-auto p-5">
                            {/* Date Header */}
                            <div className="mb-6">
                                <h2 className="text-2xl font-bold text-slate-800">{format(currentDate, 'M월 d일')}</h2>
                                <p className="text-sm text-slate-500">{format(currentDate, 'EEEE', { locale: ko })}</p>
                            </div>

                            {/* Events Summary */}
                            {events.length === 0 ? (
                                <div className="text-center py-8">
                                    <CalendarIcon size={40} className="mx-auto mb-3 text-slate-200" />
                                    <p className="text-sm text-slate-400">오늘 일정이 없습니다</p>
                                    <button
                                        onClick={() => {
                                            const start = new Date(currentDate);
                                            start.setHours(9, 0, 0, 0);
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
                                        className="mt-4 text-xs text-blue-500 font-medium hover:underline"
                                    >
                                        + 일정 추가하기
                                    </button>
                                </div>
                            ) : (
                                <div className="space-y-2">
                                    {/* All-day events */}
                                    {sortedEvents.allDay.length > 0 && (
                                        <div className="mb-4">
                                            <p className="text-xs font-medium text-slate-400 mb-2">종일</p>
                                            {sortedEvents.allDay.map(ev => {
                                                const self = ev.attendees?.find(a => a.self);
                                                const isDeclined = self?.responseStatus === 'declined';
                                                const isTentative = self?.responseStatus === 'tentative' || self?.responseStatus === 'needsAction';

                                                let styleClass = 'bg-blue-50 text-blue-700 hover:bg-blue-100';
                                                if (isDeclined) {
                                                    styleClass = 'bg-white border border-slate-200 text-slate-400 line-through hover:bg-slate-50';
                                                } else if (isTentative) {
                                                    styleClass = 'bg-white border border-dashed border-slate-300 text-slate-600 hover:bg-slate-50';
                                                }

                                                return (
                                                    <button
                                                        key={ev.id}
                                                        onClick={() => setSelectedEvent(ev)}
                                                        className={`w-full text-left px-3 py-2 rounded-lg text-sm font-medium mb-1 transition-colors truncate ${styleClass}`}
                                                    >
                                                        {ev.summary || '(제목 없음)'}
                                                    </button>
                                                );
                                            })}
                                        </div>
                                    )}

                                    {/* Timed events */}
                                    {sortedEvents.timed.map(ev => {
                                        const startTime = ev.start.dateTime ? format(new Date(ev.start.dateTime), 'a h:mm', { locale: ko }) : '';
                                        const endTime = ev.end.dateTime ? format(new Date(ev.end.dateTime), 'a h:mm', { locale: ko }) : '';
                                        const calColor = availableCalendars.find(c => c.id === ev.calendarId)?.backgroundColor || '#3b82f6';

                                        return (
                                            <button
                                                key={ev.id}
                                                onClick={() => setSelectedEvent(ev)}
                                                onMouseEnter={() => setHoveredEventId(ev.id)}
                                                onMouseLeave={() => setHoveredEventId(null)}
                                                className={`w-full text-left flex items-start gap-3 px-3 py-2.5 rounded-lg transition-colors group ${hoveredEventId === ev.id ? 'bg-blue-50/70' : 'hover:bg-slate-50'}`}
                                            >
                                                <div
                                                    className="w-1 h-full min-h-[40px] rounded-full shrink-0"
                                                    style={{ backgroundColor: calColor }}
                                                />
                                                <div className="flex-1 min-w-0">
                                                    <p className="text-sm font-medium text-slate-800 truncate group-hover:text-blue-600">
                                                        {ev.summary || '(제목 없음)'}
                                                    </p>
                                                    <p className="text-xs text-slate-500">{startTime} - {endTime}</p>
                                                    {ev.location && (
                                                        <p className="text-xs text-slate-400 truncate mt-0.5">📍 {ev.location}</p>
                                                    )}
                                                    {ev.attendees && ev.attendees.length > 1 && (
                                                        <p className="text-xs text-slate-400 flex items-center gap-1 mt-0.5">
                                                            <Users size={12} /> {ev.attendees.length}명 참여
                                                        </p>
                                                    )}
                                                </div>
                                            </button>
                                        );
                                    })}

                                    {/* Quick add button */}
                                    <button
                                        onClick={() => {
                                            const start = new Date(currentDate);
                                            start.setHours(9, 0, 0, 0);
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
                                        className="w-full text-left px-3 py-2 text-xs text-slate-400 hover:text-blue-500 hover:bg-slate-50 rounded-lg transition-colors"
                                    >
                                        + 일정 추가하기
                                    </button>
                                </div>
                            )}
                        </div>

                        {/* Footer Stats */}
                        <div className="px-5 py-4 border-t border-slate-50 bg-slate-50/50 shrink-0">
                            <div className="flex items-center justify-between text-xs text-slate-500">
                                <span>총 {events.length}개 일정</span>
                                <span>{selectedCalendarIds.length}개 캘린더</span>
                            </div>
                        </div>
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

// Avatar Colors
const AVATAR_COLORS = ['bg-red-200', 'bg-blue-200', 'bg-green-200', 'bg-yellow-200', 'bg-purple-200', 'bg-pink-200', 'bg-indigo-200', 'bg-orange-200', 'bg-lime-200', 'bg-cyan-200'];

// Sub-component for Event Block
const TimeEventBlock = ({
    event,
    onClick,
    isSelected,
    isHovered
}: {
    event: CalendarEvent & { colIndex?: number; totalCols?: number },
    onClick?: () => void,
    isSelected?: boolean,
    isHovered?: boolean
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
        { normal: "bg-blue-50/90 text-blue-700 border-blue-200", hover: "bg-blue-100 text-blue-900 border-blue-400 ring-1 ring-blue-400" },
        { normal: "bg-emerald-50/90 text-emerald-700 border-emerald-200", hover: "bg-emerald-100 text-emerald-900 border-emerald-400 ring-1 ring-emerald-400" },
        { normal: "bg-violet-50/90 text-violet-700 border-violet-200", hover: "bg-violet-100 text-violet-900 border-violet-400 ring-1 ring-violet-400" },
        { normal: "bg-orange-50/90 text-orange-700 border-orange-200", hover: "bg-orange-100 text-orange-900 border-orange-400 ring-1 ring-orange-400" },
        { normal: "bg-rose-50/90 text-rose-700 border-rose-200", hover: "bg-rose-100 text-rose-900 border-rose-400 ring-1 ring-rose-400" },
    ];
    // Hash id
    const colorIndex = (event.id.charCodeAt(0) + (event.id.charCodeAt(event.id.length - 1) || 0)) % styles.length;
    const styleSet = event.colorId ? styles[0] : styles[colorIndex];
    let colorClass = (isHovered || isSelected) ? styleSet.hover : styleSet.normal;

    // Override style if declined or tentative
    const self = event.attendees?.find(a => a.self);
    const isDeclined = self?.responseStatus === 'declined';
    const isTentative = self?.responseStatus === 'tentative' || self?.responseStatus === 'needsAction';

    if (isDeclined) {
        colorClass = "bg-white border-slate-200 text-slate-400 line-through hover:bg-slate-50";
    } else if (isTentative) {
        colorClass = "bg-white border-dashed border-slate-300 text-slate-600 hover:bg-slate-50";
    }

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
            className={`absolute rounded-md border text-xs overflow-hidden hover:z-[60] hover:shadow-xl transition-all cursor-pointer pointer-events-auto flex flex-col px-2 py-1 pr-6 ${colorClass} ${(isSelected || isHovered) ? 'ring-2 ring-offset-1 ring-blue-500 z-[60] shadow-lg scale-[1.02]' : ''}`}
            style={{
                top: `${startMinutes}px`,
                height: `${duration}px`,
                left: `${indentPercent}%`,
                width: `${100 - indentPercent}%`,
                zIndex: (isSelected || isHovered) ? 60 : 10 + colIndex,
                boxShadow: (colIndex > 0 || isSelected || isHovered) ? '0 4px 6px -1px rgba(0, 0, 0, 0.1), 0 2px 4px -1px rgba(0, 0, 0, 0.06)' : 'none'
            }}
            title={`${event.summary}\n${format(start, 'HH:mm')} - ${format(end, 'HH:mm')}`}
        >
            <div className="font-semibold truncate leading-tight flex items-center gap-1">
                {isLinkedTodo && <FileText size={10} className="shrink-0 opacity-70" />}
                <span className="truncate">{event.summary || '(제목 없음)'}</span>
            </div>

            {/* Attendee Avatars Group */}
            {event.attendees && event.attendees.length > 0 && (
                <div className="absolute top-1 right-1 flex -space-x-1.5 pointer-events-none">
                    {event.attendees
                        .slice(0, 3)
                        .map((attendee, i) => {
                            const name = attendee.displayName || attendee.email.split('@')[0] || '?';
                            const initial = name.charAt(0).toUpperCase();

                            if (attendee.avatarUrl) {
                                return (
                                    <div
                                        key={i}
                                        className="w-4 h-4 rounded-full border border-white overflow-hidden shadow-sm bg-white"
                                        title={attendee.displayName || attendee.email}
                                    >
                                        <img src={attendee.avatarUrl} alt={name} className="w-full h-full object-cover" />
                                    </div>
                                );
                            }

                            const colorHash = name.split('').reduce((acc, char) => acc + char.charCodeAt(0), 0);
                            const bg = AVATAR_COLORS[colorHash % AVATAR_COLORS.length];

                            return (
                                <div
                                    key={i}
                                    className={`w-4 h-4 rounded-full border border-white flex items-center justify-center text-[7px] font-bold text-slate-700 shadow-sm ${bg}`}
                                    title={attendee.displayName || attendee.email}
                                >
                                    {initial}
                                </div>
                            );
                        })}
                    {event.attendees.length > 3 && (
                        <div className="w-4 h-4 rounded-full border border-white flex items-center justify-center text-[7px] font-bold bg-slate-100 text-slate-500 shadow-sm">
                            +{event.attendees.length - 3}
                        </div>
                    )}
                </div>
            )}

            {duration > 30 && (
                <div className="opacity-80 text-[10px] truncate mt-0.5">
                    {format(start, 'HH:mm')} - {format(end, 'HH:mm')}
                </div>
            )}
        </div>
    );
};

export default CalendarPage;
