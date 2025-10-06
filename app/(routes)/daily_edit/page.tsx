'use client'
import {useSession} from "next-auth/react";
import DailySnippetEdit from "@/app/(routes)/daily_snippet_edit/page";
import React, {useState} from "react";
import {motion} from "framer-motion";
import {roundTransition} from "@/app/transition/round_transition";
import LoadOrLogin from "@/components/LoadOrLogin";
import Image from "next/image";
import DailyHealthcheckEdit from "@/app/(routes)/healthcheck_edit/page";
import TopBar from "@/components/TopBar";

const DailyEdit = () => {

  const { data: session } = useSession();
  const [selectedArea, setSelectedArea] = useState<number>(0);
  const [loadOverflow, setLoadOverflow] = useState(false);

  if (!session) return <LoadOrLogin loadOverflow={loadOverflow} setLoadOverflow={setLoadOverflow} />

  return <div className={"w-screen h-screen flex flex-col"}>
    <TopBar darkmode={false} routes={["Daily Edit"]} titles={["1. Snippet 작성", "2. Health Check 작성"]} selectedArea={selectedArea} setSelectedArea={setSelectedArea} />
    <div className={"flex-1 bg-gray-100"}>
      { selectedArea == 0
        ? <DailySnippetEdit />
        : selectedArea == 1
          ? <DailyHealthcheckEdit />
          : <></>
      }
    </div>
  </div>
}

export default DailyEdit;