"use client";
import { useSession, signIn, signOut } from "next-auth/react";
import {useEffect, useState} from "react";
import CircularLoader from "@/components/CircularLoader";
import TextButton from "@/components/TextButton";
import {motion} from "framer-motion";
import fetchTeamUsers from "@/app/api/fetch_team_users";
import {useUserStore} from "@/store/useUserStore";
import fetchUserByEmail from "@/app/api/team/user/get_user_by_email/fetch_user_by_email";
import TopBar from "@/components/TopBar";
import SnippetsPage from "@/app/(routes)/snippets/page";
import HealthchecksPage from "@/app/(routes)/healthchecks/page";
import PraisesPage from "@/app/(routes)/praises/page";

export default function Page() {
  const { data: session, status } = useSession();

  const [space, setSpace] = useState(0);
  const { user, setUser } = useUserStore();
  const [selectedArea, setSelectedArea] = useState(0);

  useEffect(() => {
    if (session) {
      fetch("/api/drive/1ez6X_PnNC2Jaa-VcN6wEo_OikZQ-WbXC")
        .then((res) => res.json())
        .then((data) => {
          console.log(data)
        });
    }
    (async() => {
      await fetchTeamUsers("도다리도 뚜뚜려보고 건너는 양털");
    })();

  }, [session]);

  if (status === "loading") return <div className="flex w-screen h-screen items-center justify-center relative">
    <div className={"w-10 aspect-square"}>
      <CircularLoader />
    </div>
  </div>;

  return (
    <div className={"w-screen h-screen flex flex-col items-center justify-center overflow-y-hidden"}>
      {
        session
          ? <div className={"flex flex-col items-center w-full h-full"}>
            <TopBar darkmode={selectedArea == 2} routes={[]} titles={["Snippet 조회", "Health Check 조회", "칭찬 챌린지"]} selectedArea={selectedArea} setSelectedArea={setSelectedArea} />
            <div className={"flex-1 w-full h-full overflow-y-scroll"}>
              {
                selectedArea == 0
                ? <iframe src={"/snippets"} className={"w-full h-full"} />
                : selectedArea == 1
                  ? <HealthchecksPage />
                  : selectedArea == 2
                    ? <PraisesPage />
                    : <></>
              }
            </div>
              {/*<TextButton onClick={() => {*/}
              {/*  signOut();*/}
              {/*  setUser(null);*/}
              {/*}} text={"로그아웃"}></TextButton>*/}
          </div>
          : <div className={"flex flex-col space-y-10 items-center"}>
            <p className={"text-2xl font-bold"}>도다리도 뚜뚜려보고 건너는 양털 팀의</p>
            <p className={"text-7xl font-black"}>Daily Utils</p>
            <motion.div className={"cursor-pointer text-center p-5 bg-black rounded-xl text-white font-semibold text-xl"} onClick={async () => {
              signIn("google");
            }}>Google 로그인</motion.div>
          </div>
      }

    </div>
  );
}