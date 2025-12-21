"use client"
import React, { useEffect, useState, useRef } from "react";
import NovelEditor, { NovelEditorHandle } from "@/components/NovelEditor";
import formatDate from "@/lib/utils/format_date";
import fetchSnippet from "@/app/api/fetch_snippet";
import { Snippet } from "@/model/snippet";
import { addSnippet } from "@/app/api/snippet/add_snippet/add_snippet";
import CircularLoader from "@/components/CircularLoader";
import { driveUploadFile } from "@/app/api/drive_upload_file";
import { driveGetFolder } from "@/app/api/drive_get_folder";
import { driveDeleteFile } from "@/app/api/drive_delete_file";
import { snippetDriveId } from "@/app/data/drive_id";
import { useUser } from "@/context/SupabaseProvider";
import { Check, Clock, Save, Upload, Calendar as CalendarIcon, Loader2, PlusCircle } from "lucide-react";
import { startOfDay, endOfDay, format } from "date-fns";

interface CalendarEvent {
  id: string;
  summary: string;
  start: { dateTime?: string; date?: string };
  end: { dateTime?: string; date?: string };
}

type dailySnippetEditProps = {
  setSelectedArea: (area: number) => void;
};

export const DailySnippetEdit = ({ setSelectedArea }: dailySnippetEditProps) => {
  const template = ``;
  const editorRef = useRef<NovelEditorHandle>(null);
  const [submitText, setSubmitText] = useState<string>("발행하기");
  const [snippetContent, setSnippetContent] = useState(template);
  const [selectedDate, setSelectedDate] = useState(formatDate(new Date()));
  const [snippets, setSnippets] = useState<Snippet[]>([]);
  const [isUploading, setIsUploading] = useState(false);
  const [loadStatus, setLoadStatus] = useState(false);
  const [editorDisabled, setEditorDisabled] = useState(true);
  const [initCompleted, setInitCompleted] = useState(false);
  const [error, setError] = useState("");
  const [tempContent, setTempContent] = useState("");
  const [calendarEvents, setCalendarEvents] = useState<CalendarEvent[]>([]);
  const [isCalendarLoading, setIsCalendarLoading] = useState(false);
  const { user } = useUser();

  const dailySnippetAvailableDate = () => {
    const now = new Date();
    const yesterday = new Date();
    if (now.getHours() < 9) {
      yesterday.setDate(yesterday.getDate() - 1)
      return [formatDate(yesterday), formatDate(now)]
    } else {
      return [formatDate(now)]
    }
  }

  useEffect(() => {
    const availableDate = dailySnippetAvailableDate();
    setSelectedDate(availableDate[0]);
  }, []);

  const getMySnippets = async (email: string) => {
    const availableDate = dailySnippetAvailableDate();
    const startYesterday = new Date(availableDate[0]!);
    startYesterday.setDate(startYesterday.getDate() - 1);
    const snippets = await fetchSnippet(formatDate(startYesterday)!, availableDate.length == 2 ? availableDate[1]! : availableDate[0]!);
    return snippets.filter((snippet: Snippet) => snippet.user_email == email).sort((a: Snippet, b: Snippet) => Number(new Date(a.snippet_date)) - Number(new Date(b.snippet_date)));
  }

  useEffect(() => {
    (async () => {
      if (user && !initCompleted) {
        setLoadStatus(false);
        try {
          const res = await getMySnippets(user?.email as string);
          setSnippets(res);
          setLoadStatus(true);
          setInitCompleted(true);
        } catch (e) {
          setError(e as string);
        }
      }
    })();
  }, [user, initCompleted]);

  // Sync content and locked state when date or snippets change
  useEffect(() => {
    const snip = snippets.find((sn) => sn.snippet_date === selectedDate);
    if (snip) {
      setSnippetContent(snip.content);
      setEditorDisabled(true);
    } else {
      setEditorDisabled(false);
      // Only reset if it's not the initial load or a deliberate change
      // (Optional: preserve temp content if switching away and back)
    }
  }, [selectedDate, snippets]);

  // Update tempContent (Yesterday's Snippet) whenever selectedDate or snippets change
  useEffect(() => {
    if (!selectedDate) {
      setTempContent("");
      return;
    }

    // Parse selectedDate (YYYY-MM-DD) to Local Date to avoid Timezone issues
    const [y, m, d] = selectedDate.split('-').map(Number);
    const targetDate = new Date(y, m - 1, d);
    targetDate.setDate(targetDate.getDate() - 1);
    const targetDateStr = formatDate(targetDate);

    const prevSnippet = snippets.find(s => s.snippet_date === targetDateStr);

    if (prevSnippet) {
      setTempContent(prevSnippet.content);
    } else {
      setTempContent("");
    }
  }, [selectedDate, snippets]);

  // Fetch calendar events
  useEffect(() => {
    const fetchEvents = async () => {
      if (!selectedDate) return;
      setIsCalendarLoading(true);
      try {
        const timeMin = startOfDay(new Date(selectedDate)).toISOString();
        const timeMax = endOfDay(new Date(selectedDate)).toISOString();
        const res = await fetch(`/api/calendar/events?timeMin=${timeMin}&timeMax=${timeMax}&calendarIds=primary`, {
          cache: 'no-store'
        });
        if (res.ok) {
          const data = await res.json();
          setCalendarEvents(data);
        }
      } catch (e) {
        console.error("Failed to fetch calendar events", e);
      } finally {
        setIsCalendarLoading(false);
      }
    };
    fetchEvents();
  }, [selectedDate]);

  const handlePublish = async () => {
    if (!isUploading && user?.email != "" && editorRef.current) {
      setEditorDisabled(true);
      const email = user?.email as string;
      setIsUploading(true);
      setSubmitText("처리 중...")

      const markdownContent = await editorRef.current.getMarkdown();
      const result = (await addSnippet(email, selectedDate!, markdownContent)).received;
      const myDriveList = (await driveGetFolder(snippetDriveId)).filter((f: { id: string, name: string }) => f.name == `${selectedDate!}_${user?.user_metadata.full_name}`);

      if (result.length == 1) {
        const freshSnippets = await getMySnippets(user?.email as string);
        setSnippets(freshSnippets);
        for await (const file of myDriveList) {
          await driveDeleteFile(file.id);
        }
        await driveUploadFile(snippetDriveId, `${selectedDate!}_${user?.user_metadata.full_name}`, markdownContent);
        setSubmitText("발행 완료");
        window.localStorage.removeItem(`snippet__tempsave__${selectedDate!}`);

        setTimeout(() => {
          setIsUploading(false);
          setSelectedArea(1);
        }, 800);
      } else {
        setSubmitText("이미 존재함");
        setTimeout(() => setIsUploading(false), 800);
      }
    }
  };

  if (error) return (
    <div className="w-full h-full flex items-center justify-center bg-white p-10">
      <div className="max-w-xs text-center">
        <p className="text-sm text-slate-400 mb-4">{error || "서버에 접속할 수 없습니다."}</p>
        <button onClick={() => window.location.reload()} className="text-xs font-bold underline decoration-slate-200 underline-offset-4">다시 시도</button>
      </div>
    </div>
  );

  const isPublished = snippets.some((snip: Snippet) => snip.snippet_date == selectedDate);

  return (
    <div className="w-full h-full bg-white relative font-sans text-slate-900 scrollbar-hide flex">
      {/* Left Sidebar: Calendar Events */}
      <aside className="w-72 h-screen sticky top-0 border-r border-slate-50 p-8 flex flex-col shrink-0 overflow-y-auto scrollbar-hide">
        <div className="flex items-center gap-2 mb-8">
          <CalendarIcon size={14} className="text-slate-400" />
          <h2 className="text-[10px] font-bold uppercase tracking-[0.2em] text-slate-400">Today's Schedule</h2>
        </div>

        {isCalendarLoading ? (
          <div className="flex flex-col gap-4">
            {[1, 2, 3].map((i) => (
              <div key={i} className="animate-pulse flex flex-col gap-2">
                <div className="h-2 w-12 bg-slate-50 rounded" />
                <div className="h-3 w-full bg-slate-50 rounded" />
              </div>
            ))}
          </div>
        ) : calendarEvents.length > 0 ? (
          <div className="flex flex-col gap-8">
            {calendarEvents.map((event) => {
              const startTime = event.start.dateTime ? format(new Date(event.start.dateTime), "HH:mm") : "";
              const endTime = event.end.dateTime ? format(new Date(event.end.dateTime), "HH:mm") : "";
              const isAllDay = !event.start.dateTime;
              const timeRange = isAllDay ? "All Day" : `${startTime} - ${endTime}`;

              return (
                <button
                  key={event.id}
                  onClick={() => {
                    if (editorRef.current) {
                      const isEmpty = editorRef.current.isEmpty();
                      let nextIdx = 1;

                      if (!isEmpty) {
                        const markdown = editorRef.current.getMarkdown();
                        // Find all number patterns (including our invisible \u200B prefix)
                        const matches = markdown.match(/(\d+)\.\s/g);
                        if (matches) {
                          const numbers = matches.map(m => parseInt(m.match(/\d+/)![0]));
                          nextIdx = Math.max(...numbers) + 1;
                        }
                      }

                      // \u200B is a Zero-Width Space to bypass Tiptap auto-list (prevents nesting)
                      const summary = `\u200B${nextIdx}. [${timeRange}] ${event.summary}`;
                      editorRef.current.insertContent(summary);
                    }
                  }}
                  className="group relative flex flex-col gap-1.5 text-left w-full p-3 -m-3 rounded-xl hover:bg-slate-50 transition-all active:scale-[0.98]"
                >
                  <span className="text-[10px] font-medium text-slate-400 tabular-nums">
                    {timeRange}
                  </span>
                  <h3 className="text-sm font-medium text-slate-700 leading-snug group-hover:text-slate-900 transition-colors">
                    {event.summary}
                  </h3>
                  <div className="opacity-0 group-hover:opacity-100 absolute right-3 top-1/2 -translate-y-1/2 text-slate-300 transition-all">
                    <PlusCircle size={14} />
                  </div>
                </button>
              );
            })}
          </div>
        ) : (
          <div className="flex flex-col items-center justify-center py-10 opacity-30">
            <CalendarIcon size={24} className="mb-4 text-slate-300" />
            <span className="text-[10px] font-medium text-slate-400">No events today</span>
          </div>
        )}
      </aside>

      <div className="flex-1 h-full flex flex-col items-center overflow-y-auto">

        {/* Ultra Minimal Header */}
        <header className="w-full max-w-4xl px-8 py-10 flex items-center justify-between">
          <div className="flex flex-col">
            {/* <h1 className="text-xl font-medium tracking-tight">Daily Snippet</h1> */}
            <div className="flex items-center gap-2 mt-1">
              {dailySnippetAvailableDate().map((date) => {
                const snippet: Snippet[] = snippets.filter((snip: Snippet) => snip.snippet_date == date);
                const isSelected = selectedDate == date;
                const datePublished = snippet.length == 1;
                const dateSplit = date!.split("-");

                return (
                  <button
                    key={date}
                    onClick={() => {
                      if (loadStatus) {
                        setSelectedDate(date!);
                      }
                    }}
                    className={`px-5 py-2 border border-slate-200 rounded-full text-lg font-medium transition-all ${isSelected ? "text-slate-900" : "text-slate-300 hover:text-slate-500"
                      } flex items-center gap-1.5`}
                  >
                    <span>{`${dateSplit[1]}.${dateSplit[2]}`}</span>
                    {datePublished && <div className="w-1 h-1 rounded-full bg-slate-900" />}
                  </button>
                );
              })}
            </div>
          </div>

          <div className="flex items-center gap-6">
            <div className="flex items-center gap-4">
              <button
                onClick={async () => {
                  if (editorRef.current) {
                    const markdown = editorRef.current.getMarkdown();
                    window.localStorage.setItem(`snippet__tempsave__${selectedDate!}`, markdown);
                    alert("임시저장되었습니다.");
                  }
                }}
                className="text-[11px] font-bold uppercase tracking-widest text-slate-400 hover:text-slate-900 transition-colors"
              >
                Save
              </button>
              <button
                onClick={() => {
                  const result = window.localStorage.getItem(`snippet__tempsave__${selectedDate!}`);
                  if (result && window.confirm("저장된 내용을 불러올까요?")) {
                    setSnippetContent(result!);
                    setEditorDisabled(false);
                  }
                }}
                className="text-[11px] font-bold uppercase tracking-widest text-slate-400 hover:text-slate-900 transition-colors"
              >
                Load
              </button>
            </div>

            <button
              onClick={handlePublish}
              disabled={isUploading || isPublished}
              className={`text-[11px] font-black uppercase tracking-[0.2em] px-5 py-2.5 rounded-full transition-all border ${isUploading
                ? "bg-slate-50 text-slate-300 border-slate-100"
                : isPublished
                  ? "bg-slate-900 text-white border-slate-900 opacity-50 cursor-not-allowed"
                  : "bg-white text-slate-900 border-slate-900 hover:bg-slate-900 hover:text-white"
                }`}
            >
              {isUploading ? submitText : isPublished ? "Published" : "Publish"}
            </button>
          </div>
        </header>

        {/* Pure Canvas */}
        <main className="w-full max-w-4xl px-8 pb-32">
          <div className="relative">
            {isPublished && (
              <div className="mb-8 p-6 bg-slate-50 rounded-xl flex items-center justify-center">
                <span className="text-xs text-slate-500 font-medium italic">이미 발행된 기록입니다. 수정이 불가합니다.</span>
              </div>
            )}

            <div className={`transition-opacity duration-300 ${editorDisabled ? "opacity-50" : "opacity-100"}`}>
              <NovelEditor
                key={selectedDate}
                ref={editorRef}
                initialContent={snippetContent}
                editable={!editorDisabled}
                suggestionText={tempContent}
                onKeyDown={(e) => {
                  if (e.isComposing || e.keyCode === 229) return;
                  // Old prompt logic removed in favor of Tab autocomplete
                }}
              />
            </div>
          </div>
        </main>
      </div>
    </div>
  );
};