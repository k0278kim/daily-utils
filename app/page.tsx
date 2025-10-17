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
import JapdoriPage from "@/app/(routes)/japdori/page";
import ProfilePage from "@/app/(routes)/profile/page";
import {Overlay} from "next/dist/next-devtools/dev-overlay/components/overlay";

export default function Page() {
  const { data: session, status } = useSession();

  const [space, setSpace] = useState(0);
  const { user, setUser } = useUserStore();
  const [selectedArea, setSelectedArea] = useState(0);
  const [overlay, setOverlay] = useState(true);

  const VERSION = "2.1.2";
  const UPDATE_MEMOS = ["1. Daily Snippet 입력 시 Enter로 어제 Snippet 가져오기.", "2. 프로필 조회 (베타)", "3. Daily Snippet 및 Health Check 입력 가능일이 여러 개라면, 입력 가능일 중 제일 첫 번째 날짜가 초기 선택됩니다.", "Health Check 점수 스펙트럼 색을 유저 니즈에 따라 변경했습니다."];

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
          ? <div className={"flex flex-col items-center w-full h-full relative"}>
            { overlay && window.localStorage.getItem("update_checked_version") != VERSION && <div className={"flex items-center justify-center w-full h-full bg-black/20 absolute top-0 z-50"}>
              <div className={"bg-white w-[60%] h-fit rounded-2xl p-10 items-center flex flex-col"}>
                <p className={"text-2xl font-bold mb-10"}>Daily Utils가 업데이트 되었습니다.</p>
                { UPDATE_MEMOS.map((memo) => <p key={memo}>{memo}</p>) }
                <div className={"mb-10"}></div>
                <TextButton text={"확인했어요"} onClick={() => {
                  window.localStorage.setItem("update_checked_version", VERSION);
                  setOverlay(false);
                }}/>
              </div>
            </div>
            }
            <TopBar darkmode={selectedArea == 2 || selectedArea == 3} routes={[]} titles={["Snippet 조회", "Health Check 조회", "칭찬 챌린지", "잡도리 챌린지"]} selectedArea={selectedArea} setSelectedArea={setSelectedArea} />
            <div className={"flex-1 w-full h-full overflow-y-scroll scrollbar-hide"}>
              {
                selectedArea == 0
                ? <SnippetsPage />
                : selectedArea == 1
                  ? <HealthchecksPage />
                  : selectedArea == 2
                    ? <PraisesPage />
                    : selectedArea == 3
                      ? <JapdoriPage />
                      : selectedArea == -2
                        ? <ProfilePage />
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
              signIn("google", { prompt: "consent", access_type: "offline" });
            }}>Google 로그인</motion.div>
          </div>
      }

    </div>
  );
}