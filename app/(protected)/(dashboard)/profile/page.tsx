"use client"

import Image from "next/image";
import {signOut, useSession} from "next-auth/react";
import LoadOrLogin from "@/components/LoadOrLogin";
import {MouseEventHandler, useEffect, useState} from "react";
import VacationPage from "@/app/(protected)/(dashboard)/profile/vacation/page";
import JigakPage from "@/app/(protected)/(dashboard)/profile/jigak/page";
import { motion } from "framer-motion";
import {roundTransition} from "@/app/transition/round_transition";
import {useSupabaseClient, useUser} from "@/context/SupabaseProvider";
import {useRouter} from "next/navigation";
import {User} from "@/model/user";
import AvatarOverlay from "@/app/(protected)/(dashboard)/profile/components/AvatarOverlay";

const ProfilePage = () => {
  const { user } = useUser();
  const [page, setPage] = useState<"VACATION" | "PROFILE" | "JIGAK">("PROFILE");
  const supabase = useSupabaseClient();
  const router = useRouter();
  const [profile, setProfile] = useState<User|null>(null);
  const [avatarUrl, setAvatarUrl] = useState("");
  const [avatarOverlay, setAvatarOverlay] = useState(false);

  useEffect(() => {
    if (user && !profile) {
      (async () => {
        const { data, error } = await supabase.from("profiles")
          .select("*")
          .eq("email", user?.email)
          .single();

        if (data) {
          setProfile(data);
        }
      })();
    }
  }, [user]);

  return <div className={"w-full h-full flex justify-center px-20"}>
    {
      avatarOverlay && <AvatarOverlay setAvatarUrl={setAvatarUrl} />
    }
    <div className={"flex flex-col w-96 space-y-10 justify-center border-r-[1px] border-r-gray-200"}>
      <div className={"w-52 aspect-square rounded-full relative mb-12"} onClick={() => setAvatarOverlay(true)}>
        <Image src={profile?.avatar_url ? profile.avatar_url.replace(/=s\d+-c/, '=s1024-c') : ""} alt={""} fill className={"object-cover rounded-full"} />
        <div className={"w-12 aspect-square bg-white border border-gray-300 rounded-full flex items-center justify-center absolute bottom-2 right-2"}>
          <Image src={"/profile/pencil.svg"} alt={""} width={20} height={20} />
        </div>
      </div>
      <div className={"flex flex-col space-y-2.5"}>
        <p className={"text-2xl font-bold"}>{profile?.name}({profile?.nickname})</p>
        <p className={"text-lg text-gray-500"}>{user?.email}</p>
      </div>
      <div className={"flex flex-col"}>
        <LeftbarButton icon={"/profile/calendar.svg"} title={"휴가/지각 관리"} onClick={() => setPage("VACATION")} />
        <LeftbarButton icon={"/profile/logout.svg"} title={"로그아웃"} onClick={async () => {
          if (window.confirm("로그아웃할까요?")) {
            await supabase.auth.signOut();
            router.refresh();
          }
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