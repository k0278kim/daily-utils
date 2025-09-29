"use client"

import React, {useEffect, useState} from "react";
import {Snippet} from "@/model/snippet";
import {useSession} from "next-auth/react";
import LoadOrLogin from "@/components/LoadOrLogin";
import fetchSnippet from "@/app/api/fetch_snippet";
import formatDate from "@/lib/utils/format_date";
import CircularLoader from "@/components/CircularLoader";
import ReactMarkdown from "react-markdown";
import remarkGfm from "remark-gfm";
import { motion } from "framer-motion";
import Image from "next/image";

const SnippetsPage = () => {

  const {data: session} = useSession();
  const [snippets, setSnippets] = useState<Snippet[]>([]);
  const [dateFrom, setDateFrom] = useState("");
  const [loadOverflow, setLoadOverflow] = useState(false);
  const [selectedDate, setSelectedDate] = useState(formatDate(new Date()));
  const [loading, setLoading] = useState(false);

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

    const {date_from, date_to} = weekDates(formatDate(new Date)!);
    setDateFrom(date_from!);
    console.log(date_from, date_to);

    (async() => {
      if (date_from != null && date_to != null) {
        const snippetResult = await fetchSnippet(date_from, date_to);
        setSnippets(snippetResult);
      }
    })();

  }, []);

  useEffect(() => {
    setTimeout(() => {
      setLoadOverflow(true);
    }, 3000);
  }, []);

  if (!session || snippets.length == 0) return <LoadOrLogin loadOverflow={loadOverflow} setLoadOverflow={setLoadOverflow} />
  return <div className={"w-screen h-fit min-h-screen bg-gray-100 flex flex-col py-32"}>
    <div className={"fixed w-full bottom-10 flex justify-center"}>
      <div className={"p-5 rounded-xl w-fit bg-gray-800 text-white font-bold cursor-pointer"} onClick={() => location.href="/daily_snippet_edit"}>
        Daily Snippet 작성
      </div>
    </div>
    <div className={"fixed top-0 w-screen flex justify-center bg-white p-5 border-b-[1px] border-b-gray-200 space-x-5"}>
      <Image src={"/chevron-left.svg"} alt={""} width={30} height={30} onClick={async () => {
        setLoading(true);
        const newDate = new Date(dateFrom);
        newDate.setDate(newDate.getDate() - 7);
        setDateFrom(formatDate(newDate)!);
        const {date_from, date_to} = weekDates(formatDate(newDate)!);
        if (date_from != null && date_to != null) {
          const snippetResult = await fetchSnippet(date_from, date_to);
          setSnippets(snippetResult);
          setSelectedDate(date_from);
          setLoading(false);
        }
      }} />
      <WeekCalendar date_from={dateFrom} snippets={snippets} selectedDate={selectedDate!} setSelectedDate={setSelectedDate} loading={loading} />
      <Image src={"/chevron-right.svg"} alt={""} width={30} height={30} onClick={async () => {
        setLoading(true);
        const newDate = new Date(dateFrom);
        newDate.setDate(newDate.getDate() + 7);
        setDateFrom(formatDate(newDate)!);
        const {date_from, date_to} = weekDates(formatDate(newDate)!);
        if (date_from != null && date_to != null) {
          const snippetResult = await fetchSnippet(date_from, date_to);
          setSnippets(snippetResult);
          setSelectedDate(date_from);
          setLoading(false);
        }
      }} />
    </div>
    <div className={"flex space-x-5 justify-center w-full"}>
      {
        !loading
        ? snippets.filter((f) => f.snippet_date == selectedDate).length != 0
          ? snippets.filter((f) => f.snippet_date == selectedDate).map((snippet: Snippet, i) => <div key={i} className={"h-fit"}>
            <SnippetBlock snippet={snippet}/>
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
  return <div className={"max-w-[700px] md:max-w-[1000px] w-full h-fit grid grid-cols-7 gap-2.5"}>
    {
      Array.from({ length: 7 }, (_, i) => i).map((_, i) => {
        const date = new Date(date_from);
        date.setDate(date.getDate() + i);
        const daySnippets = snippets.filter((f)=>f.snippet_date == formatDate(date));
        return <div key={date.getDate()} className={"flex flex-col space-y-2.5 items-center"} onClick={() => setSelectedDate(formatDate(date)!)}>
          <div className={`flex w-full h-10 rounded-lg font-semibold text-lg space-x-2.5 items-center justify-center ${formatDate(date) == selectedDate ? daySnippets.length == 0 ? "bg-gray-400" : daySnippets.length == 3 ? "bg-green-500" : "bg-yellow-500" : daySnippets.length == 0 ? "bg-gray-100" : daySnippets.length == 3 ? "bg-green-100" : "bg-yellow-100"}`}>
            {
              !loading
              ? daySnippets.map((snippet, i) => {
                return <div key={i} className={`w-3 aspect-square rounded-full ${formatDate(date) == selectedDate ? "bg-white" : daySnippets.length == 3 ? "bg-green-500" : "bg-yellow-500"}`}></div>
              })
              : <div className={"w-4 aspect-square"}><CircularLoader/></div>
            }
          </div>
          { formatDate(new Date()) == formatDate(date)
              ? <p>오늘</p>
              : <p className={`${formatDate(date) == selectedDate ? "font-semibold" : ""}`}>{date.getDate()} ({["일", "월", "화", "수", "목", "금", "토"][date.getDay()]})</p>
          }
        </div>;
      })
    }
  </div>
}

export default SnippetsPage;

type snippetBlockType = {
  snippet: Snippet;
}

const SnippetBlock = ({ snippet }: snippetBlockType) => {

  return <div className={"w-full md:w-[30vw] h-fit md:max-h-full overflow-y-scroll border-[1px] bg-white border-gray-200 rounded-2xl flex flex-col p-10"}>
    <p className={"font-bold text-xl"}>{snippet.full_name}</p>
    <p>{snippet.user_email}</p>
    <div className={"text-sm mt-5 p-3 rounded-lg bg-gray-100 text-gray-700"}>
      <p className={"font-semibold"}>마지막 업데이트</p>
      <p>{snippet.updated_at}</p>
    </div>
    <article className="prose mt-10">
      <ReactMarkdown remarkPlugins={[remarkGfm]}>
        {snippet.content}
      </ReactMarkdown>
    </article>
  </div>
}