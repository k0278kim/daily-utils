'use client'

import {useEffect, useState} from "react";
import formatDate from "@/lib/utils/format_date";
import {Notion} from "@/model/notion";
import addSnippet from "@/app/api/add_snippet";
import ReactMarkdown from "react-markdown";
import remarkGfm from "remark-gfm";
import {AnimatePresence, motion} from "framer-motion";
import CircularLoader from "@/components/CircularLoader";
import fetchNotionSnippetCompareCheck from "@/app/api/notion_snippet_compare_check";
import fetchNotionSnippet from "@/app/api/fetch_notion_snippet";
import Image from "next/image";

const NotionsPage = () => {

  const [isComplete, setIsComplete] = useState(false);
  const [snippets, setSnippets] = useState<Notion[]>([]);
  const [selectedDate, setSelectedDate] = useState<Date | null>(new Date());
  const [isUpload, setIsUpload] = useState(false);
  const [compare, setCompare] = useState([]);

  useEffect(() => {
    setIsComplete(false);
    fetchNotionSnippet(formatDate(new Date()))
      .then((json) => {
        setSnippets(json);
        setIsComplete(true);
      })
      .catch((err) => console.error(err));
  }, []);

  useEffect(() => {
    (async() => {
      const compares = await fetchNotionSnippetCompareCheck(formatDate(new Date()));
      console.log(compares);
      setCompare(compares["result"]);
    })();
  }, [])

  const dailySnippetFormatDate = (date: Date) => {
    if (date > new Date(date.getFullYear(), date.getMonth(), date.getDate(), 9, 0)) {
      return formatDate(date);
    } else {
      date.setDate(date.getDate() - 1)
      return formatDate(date);
    }
  }

  const loadSnippets = async () => {
    setIsComplete(false);
    setCompare([]);
    fetchNotionSnippet(formatDate(selectedDate))
      .then((json) => {
        setSnippets(json);
        console.log(json)
        setIsComplete(true);
      })
      .catch((err) => console.error(err));
    const compares = await fetchNotionSnippetCompareCheck(formatDate(selectedDate));
    console.log(compares);
    setCompare(compares["result"]);
  }

  return <div className={"flex flex-col items-center bg-gray-100 w-screen h-screen md:p-20 overflow-y-scroll"}>
    <div className={"flex space-x-2.5 items-center w-screen bg-white border-[1px] border-gray-200 fixed top-0 justify-between md:justify-center px-5 md:px-3"}>
      <motion.input layoutId={"motion-input"} type={"date"} className={"md:w-fit md:text-xl font-bold md:rounded-2xl bg-white p-5"} onChange={(e) => {
        setSelectedDate(e.target.valueAsDate);
      }} onBlur={async () => {
        await loadSnippets();
      }} value={formatDate(selectedDate) || ""} />
      <motion.div className={"flex space-x-2.5"} transition={{ duration: 0.2 }}>
        <motion.button className={"w-fit h-10 px-2.5 space-x-2.5 flex items-center justify-center rounded-lg hover:bg-gray-100 active:bg-gray-200 border-[1px] border-gray-300 text-sm font-semibold"}
                       onClick={async () => {
                         await loadSnippets();
                       }}
        >
          <div className={"w-6 aspect-square relative"}>
            <Image src={"arrow-path.svg"} alt={""} fill className={"object-cover"} />
          </div>
          <p>다시 불러오기</p>
        </motion.button>
        <AnimatePresence>
          {
            dailySnippetFormatDate(new Date())! <= formatDate(selectedDate)!
              && <motion.button
                initial={{ scale: 0.7, filter: "blur(10px)", opacity: 0 }}
                animate={{ scale: 1, filter: "blur(0px)", opacity: 1 }}
                exit={{ scale: 0.7, filter: "blur(10px)", opacity: 0 }}
                transition={{ duration: 0.1 }}
              onClick={async () => {
                if (!isUpload) {
                  setIsUpload(true);
                  const res = []
                  const results = await fetchNotionSnippet(formatDate(selectedDate));
                  for await (const snippet of results) {
                    const result = (snippet.content).join("\n");
                    res.push(await addSnippet(snippet.who_email[0], formatDate(selectedDate)!, result));
                  }
                  if (res.length != 0) {
                    console.log(res);
                  }
                  const compares = await fetchNotionSnippetCompareCheck(formatDate(selectedDate));
                  setCompare(compares["result"]);
                  setIsUpload(false);
                }
              }} className={`flex items-center justify-center px-5 h-10 w-fit rounded-sm md:h-10 md:w-fit md:rounded-md bg-black text-white font-semibold text-sm duration-200 ${isUpload ? "opacity-50" : "opacity-100"}`}>
                { isUpload ? <div className={"w-5 aspect-square"}><CircularLoader/></div> : "스니펫 업로드" }
              </motion.button>
          }
        </AnimatePresence>
      </motion.div>
    </div>
    <div className={"flex flex-1 flex-col md:flex-row md:w-screen md:space-x-5 justify-center space-y-2.5 p-5 mt-16 md:p-0"}>
      {
        isComplete && snippets
        ? snippets.length == 0
            ? <div className={"md:text-2xl"}>아직 스니펫을 작성한 사람이 없어요.</div>
          : snippets.map((snippet) => {
              const filter = compare.filter((f) => f["user_email"] == snippet.who_email);
              const isEqual = filter.length > 0 ? filter[0]["check"] : -1;
              return <NotionBlock key={snippet.id} snippet={snippet} isEqual={isEqual}/>
            })
          : <div className={"flex items-center justify-center h-[60vh]"}><div className={"w-10 aspect-square"}>
            <CircularLoader/>
          </div></div>
      }
    </div>
  </div>
}

type notionBlockType = {
  snippet: Notion;
  isEqual: number;
}

const NotionBlock = ({ snippet, isEqual }: notionBlockType) => {

  return <div className={"w-full md:w-[30vw] h-fit md:max-h-full overflow-y-scroll border-[1px] bg-white border-gray-200 rounded-2xl flex flex-col p-10"}>
    <div className={"flex mb-5 space-x-2.5 items-center"}>
      {
        isEqual == -1
          ? <div className={"w-5 aspect-square"}><CircularLoader/></div>
          : <div className={`w-2 aspect-square rounded-full ${isEqual == 1 ? "bg-green-500" : isEqual == 2 ? "bg-red-500" : "bg-gray-200"}`}></div>
      }
      <p className={`text-sm font-semibold ${isEqual == 1 ? "text-green-700" : isEqual == 2 ? "text-red-500" : "text-gray-700"}`}>{
        isEqual == 2
          ? "노션과 Daily Snippet 데이터가 서로 달라요."
          : isEqual == 0
            ? "아직 업로드하지 않았어요." : isEqual == -1 ? "불러오고 있어요." : ""
      }</p>
    </div>
    <p className={"font-bold text-xl"}>{snippet.who}</p>
    <p>{snippet.name}</p>
    <div className={"text-sm mt-5 p-3 rounded-lg bg-gray-100 text-gray-700"}>
      <p className={"font-semibold"}>Notion Page ID</p>
      <p>{snippet.id}</p>
    </div>
    <article className="prose mt-10">
      <ReactMarkdown remarkPlugins={[remarkGfm]}>
        {snippet.content.join("\n\n")}
      </ReactMarkdown>
    </article>
  </div>
}

export default NotionsPage;