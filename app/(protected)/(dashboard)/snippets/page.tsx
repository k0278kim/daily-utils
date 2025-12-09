"use client"

import React, { useEffect, useState } from "react";
import { Snippet } from "@/model/snippet";
import { useSession } from "next-auth/react";
import LoadOrLogin from "@/components/LoadOrLogin";
import fetchSnippet from "@/app/api/fetch_snippet";
import formatDate from "@/lib/utils/format_date";
import CircularLoader from "@/components/CircularLoader";
import ReactMarkdown from "react-markdown";
import remarkGfm from "remark-gfm";
import { motion, AnimatePresence } from "framer-motion";
import Image from "next/image";
import { roundTransition } from "@/app/transition/round_transition";
import { useSupabaseClient, useUser } from "@/context/SupabaseProvider";
import { User } from "@/model/user";
import fetchUserByEmail from "@/app/api/team/user/get_user_by_email/fetch_user_by_email";

const SnippetsPage = () => {

  const { user } = useUser();
  const [snippets, setSnippets] = useState<Snippet[]>([]);
  const [dateFrom, setDateFrom] = useState("");
  const [loadOverflow, setLoadOverflow] = useState(false);
  const [selectedDate, setSelectedDate] = useState(formatDate(new Date()));
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [teamUsers, setTeamUsers] = useState<User[]>([]);
  const [me, setMe] = useState<User | null>(null);
  const supabase = useSupabaseClient();

  const weekDates = (date: string) => {
    const today = new Date(date);
    const firstDay = new Date(date);
    const lastDay = new Date(date);
    firstDay.setDate(today.getDate() - today.getDay());
    lastDay.setDate(today.getDate() + (6 - today.getDay()));
    return {
      date_from: formatDate(firstDay),
      date_to: formatDate(lastDay)
    }
  }

  useEffect(() => {
    (async () => {
      if (user) {
        const meRes: User[] = await fetchUserByEmail(user?.email as string);
        setMe(meRes[0]);
      }
    })();
  }, [user]);

  useEffect(() => {
    if (me && teamUsers.length == 0) {
      (async () => {
        const { data, error } = await supabase.from("profiles")
          .select("*")
          .eq("team_id", me?.team_id)
        if (data) {
          setTeamUsers(data);
        }
      })();
    }
  }, [me]);

  useEffect(() => {

    const { date_from, date_to } = weekDates(formatDate(new Date)!);
    setDateFrom(date_from!);
    console.log(date_from, date_to);

    (async () => {
      if (date_from != null && date_to != null) {
        try {
          setLoading(true);
          const snippetResult = await fetchSnippet(date_from, date_to);
          setSnippets(snippetResult);
          setLoading(false);
        } catch (e) {
          setError(e as string);
        }
      }
    })();

  }, []);

  useEffect(() => {
    setTimeout(() => {
      setLoadOverflow(true);
    }, 3000);
  }, []);

  if (error) return <div className={"w-full h-full flex items-center justify-center text-gray-700 text-2xl"}>Daily Snippet 서버에 접속할 수 없어요.</div>
  return <div className={"w-full h-fit min-h-screen bg-gray-100 flex flex-col"}>
    <div className={"sticky top-0 w-full flex justify-center bg-gray-100 p-5 space-x-5 z-50"}>
      <Image src={"/chevron-left.svg"} alt={""} width={30} height={30} className={"cursor-pointer"} onClick={async () => {
        setLoading(true);
        const newDate = new Date(dateFrom);
        newDate.setDate(newDate.getDate() - 7);
        setDateFrom(formatDate(newDate)!);
        const { date_from, date_to } = weekDates(formatDate(newDate)!);
        if (date_from != null && date_to != null) {
          const snippetResult = await fetchSnippet(date_from, date_to);
          setSnippets(snippetResult);
          setSelectedDate(date_from);
          setLoading(false);
        }
      }} />
      <WeekCalendar date_from={dateFrom} snippets={snippets} selectedDate={selectedDate!} setSelectedDate={setSelectedDate} loading={loading} />
      <Image src={"/chevron-right.svg"} alt={""} width={30} height={30} className={"cursor-pointer"} onClick={async () => {
        setLoading(true);
        const newDate = new Date(dateFrom);
        newDate.setDate(newDate.getDate() + 7);
        setDateFrom(formatDate(newDate)!);
        const { date_from, date_to } = weekDates(formatDate(newDate)!);
        if (date_from != null && date_to != null) {
          const snippetResult = await fetchSnippet(date_from, date_to);
          setSnippets(snippetResult);
          setSelectedDate(date_from);
          setLoading(false);
        }
      }} />
    </div>
    <div className={"flex flex-col space-y-4 px-2.5 md:p-0 md:max-w-[800px] w-full items-center mx-auto"}>
      {
        !loading
          ? snippets.filter((f) => f.snippet_date == selectedDate).length != 0
            ? snippets.filter((f) => f.snippet_date == selectedDate).map((snippet: Snippet, i) => <div key={i} className={"w-full"}>
              <SnippetBlock snippet={snippet} avatarUrl={teamUsers.length > 0 ? teamUsers.filter((user) => user.email == snippet.user_email)[0].avatar_url : ""} />
            </div>)
            : <motion.div
              initial={{ opacity: 0, translateY: 20 }}
              animate={{ opacity: 1, translateY: 0 }}
              className={"text-gray-500 font-semibold text-2xl mt-32"}>아직 스니펫을 올리지 않았어요.</motion.div>
          : <motion.div className={"w-10 aspect-square"} layoutId={"circular"}>
            <CircularLoader />
          </motion.div>
      }
    </div>
  </div>
}

type weekCalendarType = {
  date_from: string;
  snippets: Snippet[];
  selectedDate: string;
  setSelectedDate: (date: string) => void;
  loading: boolean;
}

const WeekCalendar = ({ date_from, snippets, selectedDate, setSelectedDate, loading }: weekCalendarType) => {
  const [hoverIndex, setHoverIndex] = useState(-1);

  return <div className={"max-w-[700px] md:max-w-[1000px] w-full h-fit grid grid-cols-7"} onMouseLeave={() => setHoverIndex(-1)}>
    {
      Array.from({ length: 7 }, (_, i) => i).map((_, i) => {
        const date = new Date(date_from);
        date.setDate(date.getDate() + i);
        const dayDocs = snippets.filter((f) => f.snippet_date == formatDate(date));
        return <div key={i} onMouseOver={() => setHoverIndex(i)} className={"p-2.5 relative active:scale-90 duration-100 cursor-pointer flex flex-col space-y-2.5 items-center md:justify-center"} onClick={() => setSelectedDate(formatDate(date)!)}>
          {hoverIndex == i && <motion.div transition={roundTransition} layoutId={"hover-bg"} className={"absolute w-full h-full bg-gray-400/10 z-10 rounded-xl"}></motion.div>}
          <motion.div className={`relative duration-100 flex w-7 h-7 md:w-full md:h-10 rounded-lg font-semibold text-lg md:space-x-2.5 items-center justify-center ${formatDate(date) == selectedDate ? dayDocs.length == 0 ? "bg-gray-400" : dayDocs.length == 4 ? "bg-green-500" : "bg-yellow-500" : dayDocs.length == 0 ? "bg-gray-200" : dayDocs.length == 4 ? "bg-green-500/20" : "bg-yellow-500/20"}`}>
            <div className={"md:opacity-0 absolute text-sm flex items-center justify-center"}><p>{dayDocs.length}</p></div>
            {
              !loading
                ? dayDocs.map((snippet, i) => {
                  return <motion.div key={i} className={`duration-100 md:w-3 md:aspect-square rounded-full ${formatDate(date) == selectedDate ? "bg-white" : dayDocs.length == 4 ? "bg-green-500" : "bg-yellow-500"}`}>
                  </motion.div>
                })
                : <div className={"w-4 aspect-square"}><CircularLoader /></div>
            }
          </motion.div>
          {formatDate(new Date()) == formatDate(date)
            ? <p className={`text-sm ${formatDate(date) == selectedDate ? "font-semibold" : ""}`}>오늘</p>
            : <p className={`text-sm ${formatDate(date) == selectedDate ? "font-semibold" : ""}`}>{Number(date.getMonth() + 1)}.{date.getDate()} ({["일", "월", "화", "수", "목", "금", "토"][date.getDay()]})</p>
          }
        </div>;
      })
    }
  </div>
}

export default SnippetsPage;

type snippetBlockType = {
  snippet: Snippet;
  avatarUrl: string;
}

const SnippetBlock = ({ snippet, avatarUrl }: snippetBlockType) => {

  const [isOpen, setIsOpen] = useState(false);

  return <motion.div layout className={"w-full h-fit border-[1px] bg-white border-gray-200 rounded-2xl flex flex-col overflow-hidden"}>
    <div onClick={() => setIsOpen(!isOpen)} className={"px-10 py-6 flex items-center justify-between cursor-pointer hover:bg-gray-50 transition-colors"}>
      <div className="flex items-center space-x-4">
        <div className={"w-12 h-12 rounded-full relative overflow-hidden bg-gray-200"}>
          {avatarUrl && <Image src={avatarUrl} alt={snippet.full_name} fill className={"object-cover"} />}
        </div>
        <div className="flex flex-col">
          <p className={"font-bold text-lg text-gray-900"}>{snippet.full_name}</p>
          <p className="text-sm text-gray-500">{snippet.user_email}</p>
        </div>
      </div>
      <div className="flex items-center space-x-4">
        <p className="text-xs text-gray-400 hidden md:block">
          {snippet.updated_at}
        </p>
        <motion.div
          animate={{ rotate: isOpen ? 180 : 0 }}
          transition={{ duration: 0.2 }}
        >
          <svg width="24" height="24" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
            <path d="M6 9L12 15L18 9" stroke="#9CA3AF" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
          </svg>
        </motion.div>
      </div>
    </div>

    <AnimatePresence>
      {isOpen && (
        <motion.div
          initial={{ height: 0, opacity: 0 }}
          animate={{ height: "auto", opacity: 1 }}
          exit={{ height: 0, opacity: 0 }}
          transition={{ duration: 0.3 }}
          className="overflow-hidden"
        >
          <div className="p-10 border-t border-gray-100">
            <div className={"text-sm mb-5 p-3 rounded-lg bg-gray-50 text-gray-600 block md:hidden"}>
              <p className={"font-semibold"}>마지막 업데이트</p>
              <p>{snippet.updated_at}</p>
            </div>
            <article className="prose max-w-none">
              <ReactMarkdown remarkPlugins={[remarkGfm]}>
                {snippet.content}
              </ReactMarkdown>
            </article>
          </div>
        </motion.div>
      )}
    </AnimatePresence>
  </motion.div>
}