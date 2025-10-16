"use client"

import Image from "next/image";
import {signOut, useSession} from "next-auth/react";
import LoadOrLogin from "@/components/LoadOrLogin";
import {MouseEventHandler, useState} from "react";
import VacationPage from "@/app/(routes)/profile/vacation/page";
import JigakPage from "@/app/(routes)/profile/jigak/page";
import { motion } from "framer-motion";
import {roundTransition} from "@/app/transition/round_transition";

const ProfilePage = () => {
  const { data: session } = useSession();
  const [page, setPage] = useState<"VACATION" | "PROFILE" | "JIGAK">("PROFILE");
  const [loadOverflow, setLoadOverflow] = useState(false);

  if (!session?.user) return <LoadOrLogin loadOverflow={loadOverflow} setLoadOverflow={setLoadOverflow} />

  return <div className={"w-full h-full flex justify-center px-20"}>
    <div className={"flex flex-col w-96 space-y-10 justify-center border-r-[1px] border-r-gray-200"}>
      <div className={"w-52 aspect-square rounded-full relative mb-12"}>
        <Image src={session.user?.image ? session?.user?.image.replace(/=s\d+-c/, '=s1024-c') : ""} alt={""} fill className={"object-cover rounded-full"} />
      </div>
      <div className={"flex flex-col space-y-2.5"}>
        <p className={"text-2xl font-bold"}>{session.user.name}</p>
        <p className={"text-lg text-gray-500"}>{session.user.email}</p>
      </div>
      <div className={"flex flex-col"}>
        <LeftbarButton icon={"/profile/calendar.svg"} title={"휴가/지각 관리"} onClick={() => setPage("VACATION")} />
        <LeftbarButton icon={"/profile/logout.svg"} title={"로그아웃"} onClick={() => {
          if (window.confirm("로그아웃할까요?")) signOut();
        }}/>
      </div>
    </div>
    <div className={"flex flex-col flex-1 bg-white"}>
      {
        page === "PROFILE"
        ? <></>
        : page === "VACATION"
          ? <VacationPage />
            : <></>
      }
    </div>
  </div>
}

type leftBarButtonProps = {
  icon: string;
  title: string;
  onClick?: MouseEventHandler<HTMLDivElement> | undefined
}

const LeftbarButton = ({ icon, title, onClick }: leftBarButtonProps) => {
  const [hover, setHover] = useState(false);
  return <div className={"w-full flex space-x-2.5 items-center cursor-pointer relative p-2.5"} onClick={onClick}  onMouseOver={() => setHover(true)} onMouseLeave={() => setHover(false)}>
    <div className={"w-8 aspect-square rounded-lg border-[1px] border-gray-200 flex items-center justify-center"}>
      <Image src={icon} alt={""} width={20} height={20} />
    </div>
    <p className={"font-medium"}>{title}</p>
  </div>
}

export default ProfilePage;