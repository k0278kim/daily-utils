"use client"

import React, {useEffect, useRef, useState} from "react";
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
import {driveGetFolder} from "@/app/api/drive_get_folder";
import {healthcheckDriveId} from "@/app/data/drive_id";
import {DriveFolder} from "@/model/driveFolder";
import {driveGetFile} from "@/app/api/drive_get_file";
import fetchUserByEmail from "@/app/api/team/user/get_user_by_email/fetch_user_by_email";

const HealthchecksPage = () => {

  const {data: session} = useSession();
  const [docs, setDocs] = useState<DriveFolder[]>([]);
  const [dateFrom, setDateFrom] = useState("");
  const [selectedDateDocs, setSelectedDateDocs] = useState<{email: string, date: string, content: string}[]>([]);
  const [loadOverflow, setLoadOverflow] = useState(false);
  const [selectedDate, setSelectedDate] = useState(formatDate(new Date()));
  const [loading, setLoading] = useState(false);
  const [fileLoading, setFileLoading] = useState(false);
  const latestRequestId = useRef(0);

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
        const driveFiles:DriveFolder[] = await driveGetFolder(healthcheckDriveId);
        console.log(driveFiles);
        setDocs(driveFiles);
      }
    })();

  }, []);

  useEffect(() => {
    if (session) {
      setFileLoading(true);
      const requestId = ++latestRequestId.current;
      const docsResult = [];
      const filteredDocs = docs.filter((doc) => doc.name.split("_")[0] == selectedDate);
      (async() => {
        for await (const doc of filteredDocs) {
          docsResult.push({
            email: doc.name.split("_")[1],
            date: doc.name.split("_")[0],
            content: await driveGetFile(session?.accessToken, doc.id)
          });
        }
        if (requestId === latestRequestId.current) {
          setSelectedDateDocs(docsResult);
          setFileLoading(false);
        }
      })();
    }
  }, [session, selectedDate, docs]);

  useEffect(() => {
    setTimeout(() => {
      setLoadOverflow(true);
    }, 3000);
  }, []);

  if (!session || docs.length == 0) return <LoadOrLogin loadOverflow={loadOverflow} setLoadOverflow={setLoadOverflow} />
  return <div className={"w-screen min-h-full h-fit bg-gray-100 flex flex-col relative"}>
    <div className={"sticky top-0 w-screen flex justify-center bg-white p-5 border-b-[1px] border-b-gray-200 space-x-5"}>
      <Image src={"/chevron-left.svg"} alt={""} width={30} height={30} onClick={async () => {
        const newDate = new Date(dateFrom);
        newDate.setDate(newDate.getDate() - 7);
        setDateFrom(formatDate(newDate)!);
      }} />
      <WeekCalendar date_from={dateFrom} docs={docs} selectedDate={selectedDate!} setSelectedDate={setSelectedDate} loading={loading} />
      <Image src={"/chevron-right.svg"} alt={""} width={30} height={30} onClick={async () => {
        const newDate = new Date(dateFrom);
        newDate.setDate(newDate.getDate() + 7);
        setDateFrom(formatDate(newDate)!);
      }} />
    </div>
    <div className={"flex space-x-5 justify-center w-full py-5 flex-1"}>
      {
        !loading && !fileLoading
        ? docs.filter((f) => f.name.split("_")[0] == selectedDate).length != 0
          ? selectedDateDocs.map((doc, i) => {
            return <div key={i} className={"h-fit"}>
              <HealthchecksBlock email={doc.email} date={doc.date} doc={doc.content}/>
            </div>
          })
          : <motion.div
            initial={{ opacity: 0, translateY: 20 }}
            animate={{ opacity: 1, translateY: 0 }}
            transition={{ duration: 0.3, delay: 0.2 }}
            className={"text-gray-400 font-semibold text-2xl flex items-center justify-center"}>팀 분위기가 별로인가요? 아무도 안적었네요.</motion.div>
        : <motion.div className={"w-10 aspect-square"} layoutId={"circular"}>
            <CircularLoader />
          </motion.div>
      }
    </div>
  </div>
}

type weekCalendarType = {
  date_from: string;
  docs: DriveFolder[];
  selectedDate: string;
  setSelectedDate: (date: string) => void;
  loading: boolean;
}

const WeekCalendar = ({ date_from, docs, selectedDate, setSelectedDate, loading }: weekCalendarType) => {
  return <div className={"max-w-[700px] md:max-w-[1000px] w-full h-fit grid grid-cols-7 gap-2.5"}>
    {
      Array.from({ length: 7 }, (_, i) => i).map((_, i) => {
        const date = new Date(date_from);
        date.setDate(date.getDate() + i);
        const dayDocs = docs.filter((f)=>f.name.split("_")[0] == formatDate(date));
        return <div key={date.getDate()} className={"flex flex-col space-y-2.5 items-center"} onClick={() => setSelectedDate(formatDate(date)!)}>
          <div className={`flex w-full h-10 rounded-lg font-semibold text-lg space-x-2.5 items-center justify-center ${formatDate(date) == selectedDate ? dayDocs.length == 0 ? "bg-gray-400" : dayDocs.length == 3 ? "bg-green-500" : "bg-yellow-500" : dayDocs.length == 0 ? "bg-gray-100" : dayDocs.length == 3 ? "bg-green-100" : "bg-yellow-100"}`}>
            {
              !loading
              ? dayDocs.map((snippet, i) => {
                return <div key={i} className={`w-3 aspect-square rounded-full ${formatDate(date) == selectedDate ? "bg-white" : dayDocs.length == 3 ? "bg-green-500" : "bg-yellow-500"}`}></div>
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

export default HealthchecksPage;

type healthcheckBlockType = {
  email: string;
  date: string;
  doc: string;
}

const HealthchecksBlock = ({ email, date, doc }: healthcheckBlockType) => {

  const [name, setName] = useState("");
  useEffect(() => {
    (async () => {
      const user = (await fetchUserByEmail(email))[0];
      setName(user.name);
    })();
  }, []);

  return <div className={"w-full md:w-[30vw] h-fit md:max-h-full overflow-y-scroll border-[1px] bg-white border-gray-200 rounded-2xl flex flex-col p-10"}>
    {
      name
        ? <p className={"font-bold text-xl"}>{
          name
        }</p>
        : <div className={"bg-gray-100 rounded-full w-16 h-7"}></div>
    }

    <p>{email}</p>
    <div className={"text-sm mt-5 p-3 rounded-lg bg-gray-100 text-gray-700"}>
      <p className={"font-semibold"}>업로드 일자</p>
      <p>{date}</p>
    </div>
    <article className="prose mt-10">
      <ReactMarkdown remarkPlugins={[remarkGfm]}>
        {doc}
      </ReactMarkdown>
    </article>
  </div>
}