'use client'

import {useEffect, useState} from "react";
import {Snippet} from "@/model/snippet";
import Image from "next/image";

const SnippetsPage = () => {

  const [isComplete, setIsComplete] = useState(false);
  const [snippets, setSnippets] = useState<Snippet[]>([]);
  const [selectedDate, setSelectedDate] = useState<Date | null>(new Date());

  useEffect(() => {
    setIsComplete(false);
    fetch("https://notion-daily.onrender.com/fetch_snippet?date_from=2025-09-22&date_to=2025-09-22")
      .then((res) => res.json())
      .then((json) => {
        setSnippets(json);
        setIsComplete(true);
      })
      .catch((err) => console.error(err));
  }, []);

  const formatDate = (d: Date | null) => {
    if (!d) return null;
    const y = d!.getFullYear();
    const m = String(d!.getMonth() + 1).padStart(2, "0");
    const day = String(d!.getDate()).padStart(2, "0");
    return `${y}-${m}-${day}`;
  };

  return <div className={"flex flex-col items-center bg-gray-100 w-screen h-screen p-20"}>
    <input type={"date"} className={"text-3xl font-bold mb-20 rounded-2xl bg-white border-[1px] border-gray-200 p-5"} onChange={(e) => {
      setSelectedDate(e.target.valueAsDate);
    }} onBlur={() => {
      setIsComplete(false);
      fetch("https://notion-daily.onrender.com/fetch_snippet?date_from="+formatDate(selectedDate)+"&date_to="+formatDate(selectedDate))
        .then((res) => res.json())
        .then((json) => {
          setSnippets(json);
          console.log(json)
          setIsComplete(true);
        })
        .catch((err) => console.error(err));
    }} value={formatDate(selectedDate) || ""} />
    <div className={"flex space-x-5"}>
      {
        isComplete && snippets
        ? snippets.length == 0
            ? <div className={"text-2xl"}>아직 스니펫을 작성한 사람이 없어요.</div>
          : snippets.map((snippet) => <SnippetBlock key={snippet.user_email + snippet.created_at} snippet={snippet} />)
        : <p>Loading</p>
      }
    </div>
  </div>
}

type snippetBlockType = {
  snippet: Snippet;
}

const SnippetBlock = ({ snippet }: snippetBlockType) => {
  return <div className={"w-96 h-fit max-h-[70vh] overflow-y-scroll border-[1px] bg-white border-gray-200 rounded-2xl flex flex-col p-10"}>
    <div className={"w-10 aspect-square rounded-full mb-10 relative"}>
      <Image src={snippet.avatar_url} alt={""} fill className={"object-cover rounded-xl"}/>
    </div>
    <p className={"font-bold"}>{snippet.full_name}</p>
    <p>{snippet.user_email}</p>
    <p className={"text-sm mt-10"}>{snippet.content}</p>
  </div>
}

export default SnippetsPage;