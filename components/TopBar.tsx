import React, {useEffect, useState} from "react";
import {motion} from "framer-motion";
import Image from "next/image";
import {roundTransition} from "@/app/transition/round_transition";
import {signOut, useSession} from "next-auth/react";
import {useSupabaseClient, useUser} from "@/context/SupabaseProvider";
import {useRouter} from "next/navigation";
import {User} from "@/model/user";

type topBarProps = {
  darkmode: boolean;
  routes: string[];
  titles: string[];
  selectedArea: number;
  setSelectedArea: (area: number) => void;
  routeDestinations: string[];
}

const TopBar = ({ darkmode, routes, titles, selectedArea, setSelectedArea, routeDestinations }: topBarProps) => {
  // const { data: session } = useSession();
  const [hover, setHover] = useState(-1);
  const { user } = useUser();
  const router = useRouter();
  const [profile, setProfile] = useState<User | null>(null);
  const supabase = useSupabaseClient();

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


  return <div className={`duration-200 h-fit w-full border-b-[1px] flex flex-col ${darkmode ? "bg-gray-950 border-b-gray-900" : "bg-white border-b-gray-200"}`}>
    <div className={"p-3 h-fit flex text-gray-400 items-center text-sm justify-between"}>
      <div className={"flex space-x-2.5 items-center"}>
        <motion.div
          initial={{ opacity: 0, scale: 0.7 }}
          animate={{ opacity: 1, scale: 1 }}
          className={`active:scale-90 duration-100 p-2 rounded-sm cursor-pointer ${darkmode ? "hover:bg-gray-800" : "hover:bg-gray-100"}`} onClick={() => window.location.href = "/" }><Image src={"/globe.svg"} alt={""} width={15} height={15} /></motion.div>
        {
          routes.map((route) => <div key={route} className={"flex items-center space-x-2.5"}>
            <p>/</p>
            <motion.div
              initial={{ opacity: 0, translateX: "-20%" }}
              animate={{ opacity: 1, translateX: 0 }}
              transition={{ delay: 0.2 }}
              className={`active:scale-90 duration-100 font-semibold p-2 rounded-sm cursor-pointer ${darkmode ? "text-gray-300 hover:bg-gray-800" : "text-gray-700 hover:bg-gray-100"}`}>
              <p>Daily Edit</p>
            </motion.div>
          </div>)
        }
      </div>
      <div className={""}>
        { (user && profile) &&
          <div className={"flex space-x-2.5"}>
            <button className={`flex items-center px-3 rounded-sm text-sm font-semibold ${darkmode ? "bg-gray-800 text-gray-200" : "bg-gray-200 text-gray-700"}`} onClick={() => {
              window.location.href = "/daily_edit"
            }}>오늘 기록</button>
            <Image src={profile.avatar_url} alt={""} width={30} height={30} className={"rounded-sm active:scale-90 duration-100 cursor-pointer"} onClick={() => {
              setSelectedArea(-2);
              router.replace("/profile");
            }}/>
          </div>
        }
      </div>
    </div>
    <div className={"flex text-sm px-3 space-x-2.5"} onMouseLeave={() => setHover(-1)}>
      {
        titles.map((title, index) =>
          <motion.div key={title} className={"relative"}
                      onClick={() => {
                        setSelectedArea(index);
                        router.replace(routeDestinations[index])
                      }}
                      onMouseEnter={() => setHover(index)}
          >
            { selectedArea == index && <motion.div layoutId={"backdrop-button"} transition={roundTransition} className={`z-10 absolute bottom-0 w-full h-[2px] rounded-full ${darkmode ? "bg-gray-300" : "bg-gray-800"}`}></motion.div>}
            { (hover >= 0 && hover == index) && <motion.div layoutId={"backdrop-line"} transition={roundTransition} className={`absolute bottom-2 w-full h-[calc(100%-0.5rem)] rounded-sm ${darkmode ? "bg-gray-900" : "bg-gray-100"}`}></motion.div>}
            <motion.div className={`active:scale-90 duration-100 font-semibold mb-2 z-10 p-2 cursor-pointer rounded-sm relative ${(selectedArea == index || hover == index) ? darkmode ? "text-gray-200" : "" : darkmode ? "text-gray-500" : "text-gray-600"}`}>
              <p>{title}</p>
            </motion.div>
          </motion.div>
        )
      }
    </div>
  </div>;
}

export default TopBar;