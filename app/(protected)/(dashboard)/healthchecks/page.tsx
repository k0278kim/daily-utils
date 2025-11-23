"use client"

import React, {Dispatch, SetStateAction, useEffect, useRef, useState} from "react";
import {Snippet} from "@/model/snippet";
import {useSession} from "next-auth/react";
import LoadOrLogin from "@/components/LoadOrLogin";
import fetchSnippet from "@/app/api/fetch_snippet";
import formatDate from "@/lib/utils/format_date";
import CircularLoader from "@/components/CircularLoader";
import ReactMarkdown from "react-markdown";
import remarkGfm from "remark-gfm";
import {AnimatePresence, motion} from "framer-motion";
import Image from "next/image";
import {driveGetFolder} from "@/app/api/drive_get_folder";
import {healthcheckDriveId} from "@/app/data/drive_id";
import {DriveFolder} from "@/model/driveFolder";
import {driveGetFile} from "@/app/api/drive_get_file";
import fetchUserByEmail from "@/app/api/team/user/get_user_by_email/fetch_user_by_email";
import {roundTransition} from "@/app/transition/round_transition";
import {easeInOutTranstion} from "@/app/transition/ease_transition";
import {driveDeleteFile} from "@/app/api/drive_delete_file";
import {User} from "@/model/user";
import {deleteUserHealthcheck} from "@/app/actions/deleteUserHealthcheck";
import {useSupabaseClient, useUser} from "@/context/SupabaseProvider";
import Interceptors from "undici-types/interceptors";
import retry = Interceptors.retry;
import {executeGoogleApi} from "@/utils/googleApiExecutor";

const HealthchecksPage = () => {

  const { user } = useUser();
  const [docs, setDocs] = useState<DriveFolder[]>([]);
  const [dateFrom, setDateFrom] = useState("");
  const [selectedDateDocs, setSelectedDateDocs] = useState<{email: string, date: string, content: string, id:string}[]>([]);
  const [loadOverflow, setLoadOverflow] = useState(false);
  const [selectedDate, setSelectedDate] = useState(formatDate(new Date()));
  const [removedId, setRemovedId] = useState<string[]>([]);
  const [loading, setLoading] = useState(false);
  const [fileLoading, setFileLoading] = useState(false);
  const latestRequestId = useRef(0);
  const [me, setMe] = useState<User | null>(null);

  const [teamUsers, setTeamUsers] = useState<User[]>([]);

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
    if (me && teamUsers.length == 0) {
      (async() => {
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

    const {date_from, date_to} = weekDates(formatDate(new Date)!);
    setDateFrom(date_from!);

    (async() => {
      if (date_from != null && date_to != null) {
        const driveFiles:DriveFolder[] = await driveGetFolder(healthcheckDriveId);
        console.log("driveFiles", driveFiles);
        setDocs(driveFiles);
      }
    })();

  }, []);

  useEffect(() => {
    setDocs(docs.filter((doc) => !removedId.includes(doc.id)));
  }, [removedId]);

  useEffect(() => {
    (async () => {
      if (user) {
        const meRes: User[] = await fetchUserByEmail(user?.email as string);
        setMe(meRes[0]);
      }
    })();
  }, [user]);

  async function updateSelectedDateDocs (date: string) {
    const { data: { session }} = await supabase.auth.getSession();
    if (!session) throw new Error("Session not found");
    let currentAccessToken = session.provider_token;
    setFileLoading(true);
    const requestId = ++latestRequestId.current;
    const docsResult = [];
    const filteredDocs = docs.filter((doc) => doc.name.split("_")[0] == date);
    for await (const doc of filteredDocs) {
      try {
        const content = await executeGoogleApi(
          currentAccessToken!,
          (token) => driveGetFile(token, doc.id), // 실행할 작업
          (newToken) => {
            // [선택] 토큰이 갱신됐다면 변수에 업데이트 (다음 루프를 위해)
            currentAccessToken = newToken;
          }
        );
        docsResult.push({
          email: doc.name.split("_")[1],
          date: doc.name.split("_")[0],
          content: content,
          id: doc.id
        });
      } catch (e) {
        console.error(e);
      }
    }
    if (requestId === latestRequestId.current) {
      setSelectedDateDocs(docsResult);
      setFileLoading(false);
    }
  }

  useEffect(() => {
    if (user) {
      (async() => {
        await updateSelectedDateDocs(selectedDate!);
      })();
    }
  }, [user, selectedDate, docs]);

  useEffect(() => {
    setTimeout(() => {
      setLoadOverflow(true);
    }, 3000);
  }, []);

  return <div className={"w-screen min-h-full h-fit bg-gray-100 flex flex-col relative"}>
    <motion.div
      initial={{ opacity: 0, translateY: "-100%" }}
      animate={{ opacity: 1, translateY: 0 }}
      transition={easeInOutTranstion}
      className={"sticky top-0 w-screen flex justify-center bg-gray-100 p-5 space-x-5 z-10"}>
      <Image src={"/chevron-left.svg"} alt={""} width={30} height={30} className={"active:scale-90 duration-100 cursor-pointer hover:bg-gray-400/20 rounded-lg"} onClick={async () => {
        const newDate = new Date(dateFrom);
        newDate.setDate(newDate.getDate() - 7);
        setDateFrom(formatDate(newDate)!);
        setSelectedDate(formatDate(newDate)!);
      }} />
      <WeekCalendar date_from={dateFrom} docs={docs} selectedDate={selectedDate!} setSelectedDate={setSelectedDate} loading={loading} />
      <Image src={"/chevron-right.svg"} alt={""} width={30} height={30} className={"active:scale-90 duration-100 cursor-pointer hover:bg-gray-400/20 rounded-lg"} onClick={async () => {
        const newDate = new Date(dateFrom);
        newDate.setDate(newDate.getDate() + 7);
        setDateFrom(formatDate(newDate)!);
        setSelectedDate(formatDate(newDate)!);
      }} />
    </motion.div>
    <div className={"flex flex-col space-y-2.5 md:flex-row md:space-x-5 justify-center items-center md:items-start w-full py-5 flex-1"}>
      {
        !loading && !fileLoading
        ? docs.filter((f) => f.name.split("_")[0] == selectedDate).length != 0
          ? selectedDateDocs.map((doc, i) => {
            return <div key={i} className={"p-2 md:p-0 h-fit"}>
              <HealthchecksBlock avatarUrl={teamUsers.filter((user) => user.email == doc.email)[0].avatar_url} myEmail={user?.email as string} email={doc.email} date={doc.date} doc={doc.content} id={doc.id} setRemovedId={setRemovedId} me={me}/>
            </div>
          })
          : <motion.div
            initial={{ opacity: 0, translateY: 20 }}
            animate={{ opacity: 1, translateY: 0 }}
            transition={{ duration: 0.3, delay: 0.2 }}
            className={"text-gray-400 font-semibold md:text-2xl flex items-center justify-center"}>팀 분위기가 별로인가요? 아무도 안적었네요.</motion.div>
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
  const [hoverIndex, setHoverIndex] = useState(-1);

  return <div className={"max-w-[700px] md:max-w-[1000px] w-full h-fit grid grid-cols-7"} onMouseLeave={() => setHoverIndex(-1)}>
    {
      Array.from({ length: 7 }, (_, i) => i).map((_, i) => {
        const date = new Date(date_from);
        date.setDate(date.getDate() + i);
        const dayDocs = docs.filter((f)=>f.name.split("_")[0] == formatDate(date));
        return <div key={i} onMouseOver={() => setHoverIndex(i)} className={"p-2.5 relative active:scale-90 duration-100 cursor-pointer flex flex-col space-y-2.5 items-center md:justify-center"} onClick={() => setSelectedDate(formatDate(date)!)}>
          { hoverIndex == i && <motion.div transition={roundTransition} layoutId={"hover-bg"} className={"absolute w-full h-full bg-gray-400/10 z-10 rounded-xl"}></motion.div> }
          <motion.div className={`relative duration-100 flex w-7 h-7 md:w-full md:h-10 rounded-lg font-semibold text-lg md:space-x-2.5 items-center justify-center ${formatDate(date) == selectedDate ? dayDocs.length == 0 ? "bg-gray-400" : dayDocs.length == 3 ? "bg-green-500" : "bg-yellow-500" : dayDocs.length == 0 ? "bg-gray-200" : dayDocs.length == 3 ? "bg-green-500/20" : "bg-yellow-500/20"}`}>
            <div className={"md:opacity-0 absolute text-sm flex items-center justify-center"}><p>{dayDocs.length}</p></div>
            {
              !loading
              ? dayDocs.map((snippet, i) => {
                return <motion.div key={i} className={`duration-100 md:w-3 md:aspect-square rounded-full ${formatDate(date) == selectedDate ? "bg-white" : dayDocs.length == 3 ? "bg-green-500" : "bg-yellow-500"}`}>
                </motion.div>
              })
              : <div className={"w-4 aspect-square"}><CircularLoader/></div>
            }
          </motion.div>
          { formatDate(new Date()) == formatDate(date)
              ? <p className={`text-sm ${formatDate(date) == selectedDate ? "font-semibold" : ""}`}>오늘</p>
              : <p className={`text-sm ${formatDate(date) == selectedDate ? "font-semibold" : ""}`}>{Number(date.getMonth() + 1)}.{date.getDate()} ({["일", "월", "화", "수", "목", "금", "토"][date.getDay()]})</p>
          }
        </div>;
      })
    }
  </div>
}

export default HealthchecksPage;

type healthcheckBlockType = {
  myEmail: string;
  email: string;
  date: string;
  doc: string;
  id: string;
  setRemovedId: Dispatch<SetStateAction<string[]>>;
  me: User | null;
  avatarUrl: string;
}

const HealthchecksBlock = ({ myEmail, email, date, doc, id, setRemovedId, me, avatarUrl }: healthcheckBlockType) => {

  const [name, setName] = useState("");
  const [removeHover, setRemoveHover] = useState(false);
  useEffect(() => {
    (async () => {
      const user = (await fetchUserByEmail(email))[0];
      setName(user.name);
    })();
  }, []);

  return <motion.div
    initial={{ opacity: 0, translateY: 20 }}
    animate={{ opacity: 1, translateY: 0 }}
    transition={roundTransition}
    className={"w-full md:w-[30vw] h-fit md:max-h-full border-[1px] bg-white border-gray-200 rounded-2xl flex flex-col p-10"}>
    <div className={"w-16 aspect-square rounded-lg relative mb-5"}>
      <Image src={avatarUrl} alt={""} fill className={"object-cover rounded-lg"} />
    </div>
    <div className={"flex justify-between"}>
      <div className={"flex-1"}>
        {
          name
            ? <motion.div
              initial={{ opacity: 0, translateX: -10 }}
              animate={{ opacity: 1, translateX: 0 }}
              transition={{ duration: 0.2, delay: 0.1 }}
              className={"font-bold text-xl"}>{
              name
            }</motion.div>
            : <div
              className={"font-bold text-xl text-gray-300"}>불러오고 있어요.</div>
        }
        <p className={"text-gray-500"}>{email}</p>
      </div>
      { email == myEmail && <div className={"w-10 h-10 cursor-pointer hover:bg-red-50 active:scale-90 duration-100 rounded-lg relative p-2"} onMouseEnter={() => setRemoveHover(true)} onMouseLeave={() => setRemoveHover(false)} onClick={async () => {
        const answer = window.confirm("작성한 Health Check를 삭제하시겠습니까?");
        if (answer) {
          await driveDeleteFile(id);
          await deleteUserHealthcheck("도다리도 뚜뚜려보고 건너는 양털", me!.id, date);
          setRemovedId((tempId) => [...tempId, id]);
        }
      }}>
        <svg width="24" height="24" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
          <path d="M14.7404 9L14.3942 18M9.60577 18L9.25962 9M19.2276 5.79057C19.5696 5.84221 19.9104 5.89747 20.25 5.95629M19.2276 5.79057L18.1598 19.6726C18.0696 20.8448 17.0921 21.75 15.9164 21.75H8.08357C6.90786 21.75 5.93037 20.8448 5.8402 19.6726L4.77235 5.79057M19.2276 5.79057C18.0812 5.61744 16.9215 5.48485 15.75 5.39432M3.75 5.95629C4.08957 5.89747 4.43037 5.84221 4.77235 5.79057M4.77235 5.79057C5.91878 5.61744 7.07849 5.48485 8.25 5.39432M15.75 5.39432V4.47819C15.75 3.29882 14.8393 2.31423 13.6606 2.27652C13.1092 2.25889 12.5556 2.25 12 2.25C11.4444 2.25 10.8908 2.25889 10.3394 2.27652C9.16065 2.31423 8.25 3.29882 8.25 4.47819V5.39432M15.75 5.39432C14.5126 5.2987 13.262 5.25 12 5.25C10.738 5.25 9.48744 5.2987 8.25 5.39432" stroke={removeHover ? "#FF0000" : "#0F172A"} strokeWidth="1.5" stroke-linecap="round" stroke-linejoin="round"/>
        </svg>
      </div> }
    </div>
    <article className="prose mt-10">
      <ReactMarkdown remarkPlugins={[remarkGfm]}>
        {doc}
      </ReactMarkdown>
    </article>
  </motion.div>
}