"use client";
import { useSession, signIn, signOut } from "next-auth/react";
import {useEffect, useState} from "react";
import CircularLoader from "@/components/CircularLoader";
import TextButton from "@/components/TextButton";
import {motion} from "framer-motion";

export default function Page() {
  const { data: session, status } = useSession();

  const [space, setSpace] = useState(0);

  useEffect(() => {
    if (session) {
      fetch("/api/drive/1ez6X_PnNC2Jaa-VcN6wEo_OikZQ-WbXC")
        .then((res) => res.json())
        .then((data) => {
          console.log(data)
        });
    }
  }, [session]);

  if (status === "loading") return <div className="flex w-screen h-screen items-center justify-center relative">
    <div className={"w-10 aspect-square"}>
      <CircularLoader />
    </div>
  </div>;

  return (
    <div className={"w-screen h-screen flex flex-col items-center justify-center"}>
      {
        session
          ? <div className={"flex flex-col items-center space-y-5"}>
              <p className={"text-2xl font-bold"}>{session.user?.email}</p>
              <TextButton onClick={() => {
                location.href = "/daily_snippet_edit"
              }} text={"Daily Snippet 작성하기"}></TextButton>
              <TextButton onClick={() => {
                location.href = "/snippets"
              }} text={"Snippet 조회하기"}></TextButton>
              <TextButton onClick={() => signOut()} text={"로그아웃"}></TextButton>
          </div>
          : <div className={"flex flex-col space-y-10 items-center"}>
            <p className={"text-2xl font-bold"}>도다리도 뚜뚜려보고 건너는 양털 팀의</p>
            <p className={"text-7xl font-black"}>Daily Utils</p>
            <motion.div className={"cursor-pointer text-center p-5 bg-black rounded-xl text-white font-semibold text-xl"} onClick={() => signIn("google")}>Google 로그인</motion.div>
          </div>
      }

    </div>
  );
}