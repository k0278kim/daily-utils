'use client'

import {useEffect, useState} from "react";
import formatDate from "@/lib/utils/format_date";
import {Notion} from "@/model/notion";
import addSnippet from "@/app/api/add_snippet";
import ReactMarkdown from "react-markdown";
import remarkGfm from "remark-gfm";
import {motion} from "framer-motion";
import CircularLoader from "@/components/CircularLoader";
import fetchNotionSnippetCompareCheck from "@/app/api/notion_snippet_compare_check";

const NotionsPage = () => {

  const [isComplete, setIsComplete] = useState(false);
  const [snippets, setSnippets] = useState<Notion[]>([]);
  const [selectedDate, setSelectedDate] = useState<Date | null>(new Date());
  const [isUpload, setIsUpload] = useState(false);
  const [compare, setCompare] = useState([]);

  useEffect(() => {
    setIsComplete(false);
    fetch("http://127.0.0.1:8000/fetch_notion_snippet?date="+formatDate(new Date()), {
      method: "GET",
      headers: {
        "Api-Key": process.env.NEXT_PUBLIC_API_KEY as string,
      }
    })
      .then((res) => res.json())
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


  return <div className={"flex flex-col items-center bg-gray-100 w-screen h-screen p-20"}>
    <div className={"flex space-x-5 items-center mb-10"}>
      <input type={"date"} className={"text-xl font-bold rounded-2xl bg-white border-[1px] border-gray-200 p-5"} onChange={(e) => {
        setSelectedDate(e.target.valueAsDate);
      }} onBlur={async () => {
        setIsComplete(false);
        setCompare([]);
        fetch("http://127.0.0.1:8000/fetch_notion_snippet?date="+formatDate(selectedDate), {
          method: "GET",
          headers: {
            "Api-Key": process.env.NEXT_PUBLIC_API_KEY as string,
          }
        })
          .then((res) => res.json())
          .then((json) => {
            setSnippets(json);
            console.log(json)
            setIsComplete(true);
          })
          .catch((err) => console.error(err));
        const compares = await fetchNotionSnippetCompareCheck(formatDate(selectedDate));
        console.log(compares);
        setCompare(compares["result"]);
      }} value={formatDate(selectedDate) || ""} />
      {
        formatDate(new Date()) == formatDate(selectedDate)
          && <motion.button onClick={async () => {
            if (!isUpload) {
              setIsUpload(true);
              const res = []
              for await (const snippet of snippets) {
                const result = (snippet.content).join("\n");
                res.push(await addSnippet(snippet.who_email[0], formatDate(new Date())!, result));
              }
              if (res.length != 0) {
                console.log(res);
              }
              const compares = await fetchNotionSnippetCompareCheck(formatDate(selectedDate));
              console.log(compares);
              setCompare(compares["result"]);
              setIsUpload(false);
            }
          }} className={`flex items-center justify-center h-16 w-20 rounded-2xl bg-black text-white font-semibold text-xl duration-200 ${isUpload ? "opacity-50" : "opacity-100"}`}>
            { isUpload ? <div className={"w-5 aspect-square"}><CircularLoader color={"#FFFFFF"}/></div> : "업로드" }
          </motion.button>
      }
    </div>
    <div className={"flex w-screen space-x-5 justify-center"}>
      {
        isComplete && snippets
        ? snippets.length == 0
            ? <div className={"text-2xl"}>아직 스니펫을 작성한 사람이 없어요.</div>
          : snippets.map((snippet) => {
              const filter = compare.filter((f) => f["user_email"] == snippet.who_email);
              const isEqual = filter.length > 0 ? filter[0]["check"] : -1;
              return <NotionBlock key={snippet.id} snippet={snippet} isEqual={isEqual}/>
            })
          : <div className={"flex items-center justify-center h-[60vh]"}><div className={"w-10 aspect-square"}>
            <CircularLoader color={"000000"} />
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

  return <div className={"w-[30vw] h-fit max-h-[70vh] overflow-y-scroll border-[1px] bg-white border-gray-200 rounded-2xl flex flex-col p-10"}>
    <div className={"flex mb-5 space-x-2.5 items-center"}>
      {
        isEqual == -1
          ? <div className={"w-5 aspect-square"}><CircularLoader color={"efefef"} /></div>
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