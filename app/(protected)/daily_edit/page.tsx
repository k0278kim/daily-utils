'use client'
import {useSession} from "next-auth/react";
import {DailySnippetEdit} from "@/app/(protected)/daily_edit/DailySnippetEdit";
import React, {useState} from "react";
import LoadOrLogin from "@/components/LoadOrLogin";
import DailyHealthcheckEdit from "@/app/(protected)/healthcheck_edit/page";
import TopBar from "@/components/TopBar";
import {useUser} from "@/context/SupabaseProvider";

const DailyEdit = () => {


  const { user } = useUser();
  const [selectedArea, setSelectedArea] = useState<number>(0);
  const [loadOverflow, setLoadOverflow] = useState(false);

  return <div className={"w-screen h-screen flex flex-col"}>
    <TopBar darkmode={false} routes={["Daily Edit"]} routeDestinations={[]} titles={["1. Snippet 작성", "2. Health Check 작성"]} selectedArea={selectedArea} setSelectedArea={setSelectedArea} />
    <div className={"flex-1 bg-gray-100 overflow-y-scroll scrollbar-hide"}>
      { selectedArea == 0
        ? <DailySnippetEdit setSelectedArea={setSelectedArea} />
        : selectedArea == 1
          ? <DailyHealthcheckEdit />
          : <></>
      }
    </div>
  </div>
}

export default DailyEdit;