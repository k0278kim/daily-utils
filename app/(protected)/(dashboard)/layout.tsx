'use client'
// app/(protected)/layout.tsx

import { createClient } from "@/utils/supabase/server";
import { redirect, usePathname } from "next/navigation";
import { Profile } from "@/model/Profile";
import { useSupabaseClient, useUser } from "@/context/SupabaseProvider";
import { useEffect, useState } from "react";
import fetchTeamUsers from "@/app/api/fetch_team_users";
import TextButton from "@/components/TextButton";
import TopBar from "@/components/TopBar";
import { User } from "@/model/user";

export default function DashboardLayout({ children }: { children: React.ReactNode }) {
  const { user } = useUser();

  const pathname = usePathname();
  const index = pathname === "/snippets" ? 0 : pathname === "/healthchecks" ? 1 : pathname === "/praises" ? 2 : pathname === "/japdories" ? 3 : pathname === "/todos" ? 4 : pathname === "/calendar" ? 5 : -1;

  const [selectedArea, setSelectedArea] = useState(index);
  const [overlay, setOverlay] = useState(true);


  const VERSION = "3.0.0";
  const UPDATE_MEMOS = ["1. 스프린트 기반 할 일 관리"];

  useEffect(() => {
    if (user) {
      fetch("/api/drive/1ez6X_PnNC2Jaa-VcN6wEo_OikZQ-WbXC")
        .then((res) => res.json())
        .then((data) => {
          console.log(data)
        });
    }
    (async () => {
      await fetchTeamUsers("도다리도 뚜뚜려보고 건너는 양털");
    })();

  }, [user]);

  return <div className={"w-screen h-screen flex flex-col items-center justify-center overflow-y-hidden"}>
    {
      typeof window !== "undefined" && <div className={"flex flex-col items-center w-full h-full relative"}>
        {overlay && window.localStorage.getItem("update_checked_version") != VERSION && <div className={"flex items-center justify-center w-full h-full bg-black/20 absolute top-0 z-50"}>
          <div className={"bg-white w-[60%] h-fit rounded-2xl p-10 items-center flex flex-col"}>
            <p className={"text-2xl font-bold mb-10"}>Daily Utils가 업데이트 되었습니다.</p>
            {UPDATE_MEMOS.map((memo) => <p key={memo}>{memo}</p>)}
            <div className={"mb-10"}></div>
            <TextButton text={"확인했어요"} onClick={() => {
              window.localStorage.setItem("update_checked_version", VERSION);
              setOverlay(false);
            }} />
          </div>
        </div>
        }
        <TopBar darkmode={selectedArea == 3} routes={[]} routeDestinations={["/snippets", "/healthchecks", "/praises", "/japdories", "/todos", "/calendar"]} titles={["Snippet 조회", "Health Check 조회", "칭찬 챌린지", "잡도리 챌린지", "할 일 관리", "캘린더"]} selectedArea={selectedArea} setSelectedArea={setSelectedArea} />
        <div className={"flex-1 w-full h-full overflow-y-scroll scrollbar-hide"}>
          {children}
        </div>
      </div>
    }
  </div>;
}