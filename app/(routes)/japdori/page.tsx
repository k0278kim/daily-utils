"use client"

import React, {ChangeEventHandler, useEffect, useRef, useState} from "react";
import fetchTeamUsers from "@/app/api/fetch_team_users";
import {useSession} from "next-auth/react";
import {User} from "@/model/user";
import Image from "next/image";
import IconTextButton from "@/components/IconTextButton";
import fetchUserByEmail from "@/app/api/team/user/get_user_by_email/fetch_user_by_email";
import Hangul from "hangul-js";
import CircularLoader from "@/components/CircularLoader";
import {AnimatePresence, motion} from "framer-motion";
import formatDate from "@/lib/utils/format_date";
import {roundTransition} from "@/app/transition/round_transition";
import {easeInOutTranstion} from "@/app/transition/ease_transition";
import _ from "lodash";
import LoadOrLogin from "@/components/LoadOrLogin";
import fetchTeamJapdori from "@/app/api/japdori/fetch_team_japdori/fetchTeamJapdori";
import {addJapdori} from "@/app/actions/addJapdori";
import {Japdori} from "@/model/japdori";

const JapdoriPage = () => {

  const [users, setUsers] = useState([]);
  const { data: session } = useSession();
  const [japdories, setJapdories] = useState<Japdori[]>([]);
  const [addJapdoriOverlay, setAddJapdoriOverlay] = useState(false);
  const [selectedUser, setSelectedUser] = useState<User | null>(null);
  const [me, setMe] = useState<User>();
  const [myJapdories, setMyJapdories] = useState<Japdori[]>([]);
  const [loadOverflow, setLoadOverflow] = useState(false);
  const [hoverUser, setHoverUser] = useState<User | null>(null);
  const [page, setPage] = useState<number>(0);

  useEffect(() => {
    // TODO: 순위 불러오기.
  }, []);

  useEffect(() => {
    (async() => {
      if (session) {
        const users = await fetchTeamUsers("도다리도 뚜뚜려보고 건너는 양털");
        const japdoriesRes: Japdori[] = await fetchTeamJapdori("도다리도 뚜뚜려보고 건너는 양털");
        setUsers(users);
        if (japdoriesRes) {
          japdoriesRes.sort((a, b) => (new Date(b.created_at)).getTime() - (new Date(a.created_at).getTime()));
          setJapdories(japdoriesRes);
        }
        const email = session?.user?.email;
        if (email && !me) {
          const me = await fetchUserByEmail(email);
          setMe(me[0]);
          setSelectedUser(me[0])
        }
      }
    })();
  }, [session]);

  useEffect(() => {
    if (japdories && selectedUser) {
      const myJapdories = japdories.filter((japdori) => japdori.japdori_to.email == selectedUser!.email);
      setMyJapdories(myJapdories);
      myJapdories.map((japdori) => japdori["created_at"] = formatDate(new Date(japdori.created_at)) as string);
      if (myJapdories.length >= 2) {
        myJapdories.sort((a, b) => (new Date(b.created_at)).getTime() - (new Date(a.created_at).getTime()))
      }
      console.log(_.groupBy(myJapdories, "created_at"));
    }
  }, [selectedUser, japdories]);

  if (!session) return <LoadOrLogin loadOverflow={loadOverflow} setLoadOverflow={setLoadOverflow} />

  return <div className={"w-full h-full flex relative bg-gray-900"}>
    <AnimatePresence>
      {
        addJapdoriOverlay && <motion.div className={`fixed flex w-full h-full items-center justify-center bg-black/20 z-20 duration-1000 ${addJapdoriOverlay ? "backdrop-blur-xl" : ""}`} transition={roundTransition} exit={{ opacity: 0 }}>
          <AddJapdoriOverlay setJapdories={setJapdories} japdoriFromEmail={session?.user?.email} setAddJapdoriOverlay={setAddJapdoriOverlay} me={me} setMe={setMe} />
        </motion.div>
      }
    </AnimatePresence>
    <motion.div className={`z-0 w-full h-full flex relative duration-500 ${addJapdoriOverlay ? "scale-90" : ""}`}>
      <div className={`z-50 w-72 h-full border-r-[1px] border-r-gray-800 p-3 flex flex-col space-y-5 text-white bg-gray-800 sticky left-0 duration-1000 ${addJapdoriOverlay ? "rounded-l-4xl" : ""}`}>
        <div className={"mt-5 mb-5 mx-3"}>
          <IconTextButton src={"/plus.svg"} className={"text-gray-300 bg-red-950"} text={"잡도리하기"} onClick={() => setAddJapdoriOverlay(true)} darkmode={true} />
        </div>
        <div className={"flex flex-col"}>{
          users.map((user: User) =>
            <div key={user.email} className={"relative active:scale-90 duration-100"} onMouseOver={() => setHoverUser(user)} onMouseLeave={() => setHoverUser(null)}>
              { hoverUser == user && <motion.div onClick={() => setSelectedUser(user)} transition={roundTransition} layoutId={"hover-user-bg"} className={"cursor-pointer w-full h-full absolute bg-gray-200/20 rounded-lg"}></motion.div>}
              <UserBlock user={user} selectedUser={selectedUser ? selectedUser : me} setSelectedUser={setSelectedUser} japdoriesNumber={japdories ? (japdories.filter((japdori) => japdori.japdori_to.email == user.email).length) : 0} />
            </div>)
        }</div>
      </div>
      <AnimatePresence>
        { selectedUser != undefined && myJapdories.length > 0 &&
          <motion.div
            initial={{ opacity: 0, translateX: "-100%" }}
            animate={{ opacity: 1, translateX: "0%" }}
            exit={{ opacity: 0, translateX: "-100%" }}
            transition={easeInOutTranstion}
            className={"w-72 bg-gray-800/50 overflow-y-scroll scrollbar-hide"}>
            <div className={""}>
              <div className={"font-semibold text-gray-300 text-lg px-5 pt-10 pb-3"}>모아보기</div>
              {
                myJapdories.map((japdori: Japdori, index) => <div key={"japdori_summary_" + japdori.id} className={"cursor-pointer p-5 text-gray-300 hover:bg-gray-800/70 flex space-x-2.5"}
                                                              onClick={() => {
                                                                window.location.hash = `#japdori_block_${japdori.id}`;
                                                                const hash = window.location.hash;
                                                                if (hash) {
                                                                  const el = document.querySelector(hash);
                                                                  if (el) {
                                                                    el.scrollIntoView({behavior: "smooth"});
                                                                  }
                                                                }
                                                              }}
                >
                  <div className={"w-7 text-xl font-semibold text-gray-300"}>{myJapdories.length - index}</div>
                  <div className={"flex flex-col space-y-2.5 flex-1"}>
                    <p className={""}>{japdori.title}</p>
                    <p className={"text-sm text-gray-500"}>{japdori.japdori_from.name} · {formatDate(new Date(japdori.created_at))}</p>
                  </div>
                </div>)
              }
            </div>
          </motion.div>
        }
      </AnimatePresence>

      <div className={`flex-1 w-full h-full bg-gray-900 flex justify-center overflow-y-scroll duration-500 scrollbar-hide ${addJapdoriOverlay ? "rounded-r-4xl" : ""}`}>{
        selectedUser != undefined
          ? myJapdories.length > 0
            ? <div className={"w-[60%] min-w-[300px] py-20 space-y-12"}>
              {
                myJapdories.map((japdori: Japdori) =>
                  <JapdoriBlock key={japdori.id} japdori_id={japdori.id} japdori_from={japdori.japdori_from} japdori_to={japdori.japdori_to} title={japdori.title} content={japdori.content} created_at={new Date(japdori.created_at)} />
                )}
            </div>
            : <motion.div
              initial={{ opacity: 0, translateY: 10 }}
              animate={{ opacity: 1, translateY: 0 }}
              transition={{ delay: 0.3, duration: 0.5 }}
              className={"text-gray-500 font-semibold text-2xl items-center h-full flex justify-center"}>아직 잘 하고 있을걸요..?</motion.div>
          : <motion.div className={"w-10 aspect-square"} layoutId={"circular"}>
            <CircularLoader />
          </motion.div>
      }
      </div>
    </motion.div>
  </div>
}

type userBlockType = {
  user: User,
  selectedUser: User | undefined,
  setSelectedUser: (user: User) => void,
  japdoriesNumber: number
}
const UserBlock = ({ user, selectedUser, setSelectedUser, japdoriesNumber }: userBlockType) => {
  return <motion.div
    initial={{ opacity: 0, translateX: -10 }}
    animate={{ opacity: 1, translateX: 0 }}
    layoutId={"user_"+user.name}
    className={`active:scale-90 duration-100 flex items-center justify-between cursor-pointer w-full h-fit px-5 py-3 rounded-lg ${selectedUser?.uuid === user.uuid ? "bg-gray-900" : ""}`} onClick={() => setSelectedUser(user)}>
    <div className={"flex flex-col"}>
      <p className={"font-semibold text-gray-300"}>{user.name}</p>
      <p className={"text-gray-400 text-sm"}>{user.nickname}</p>
    </div>
    <div className={`duration-100 w-7 h-7 flex items-center justify-center text-white opacity-70 font-bold rounded-full ${japdoriesNumber > 0 ? "bg-red-500" : selectedUser?.uuid == user.uuid ? "bg-gray-800" : "bg-gray-700"}`}>{japdoriesNumber}</div>
  </motion.div>
}

type japdoriBlockType = {
  japdori_id: string;
  japdori_from: User;
  japdori_to: User;
  title: string;
  content: string;
  created_at: Date;
}

const JapdoriBlock = ({ japdori_id, japdori_from, japdori_to, title, content, created_at }: japdoriBlockType) => {
  return <motion.div
    initial={{ opacity: 0, scale: 0.95 }}
    animate={{ opacity: 1, scale: 1 }}
    transition={roundTransition}
    className={"flex flex-col space-y-5 text-white"} layoutId={"japdori_block_"+japdori_id}>
    <div className={"flex justify-between items-center"} id={"japdori_block_"+japdori_id}>
      <div className={"flex space-x-5 items-center"}>
        <div className={"rounded-lg bg-gray-600 w-10 aspect-square flex items-center justify-center"}>
          <Image src={"/user.svg"} width={20} height={20} alt={""} />
        </div>
        <div className={"flex flex-col"}>
          <p className={"font-bold text-lg text-gray-300"}>{japdori_from.name}</p>
          <p className={"opacity-60"}>{japdori_from.nickname}</p>
        </div>
      </div>
      <p className={"text-gray-400"}>{formatDate(created_at)}</p>
    </div>
    <div className={"w-full p-7 flex flex-col bg-gray-800 rounded-3xl"}>
      <div className={"flex flex-col space-y-2.5"}>
        <p className={"font-bold text-lg break-keep text-gray-300"}>{title}</p>
        <p className={"text-gray-300 break-keep"}>{content}</p>
      </div>
    </div>
  </motion.div>
}

type addJapdoriOverlayType = {
  setJapdories: (japdories: Japdori[]) => void;
  japdoriFromEmail: string | null | undefined;
  setAddJapdoriOverlay: (newAddJapdoriOverlay: boolean) => void;
  me: User | undefined;
  setMe: (newMe: User | undefined) => void;
}

const AddJapdoriOverlay = ({ setJapdories, japdoriFromEmail, setAddJapdoriOverlay, me, setMe }: addJapdoriOverlayType) => {
  const [japdoriTo, setJapdoriTo] = useState<User | null>(null);
  const [teamUsers, setTeamUsers] = useState<User[]>([]);
  const [searchUsers, setSearchUsers] = useState<User[]>([]);
  const [title, setTitle] = useState("");
  const [content, setContent] = useState("");
  const [editable, setEditable] = useState(true);
  const [editString, setEditString] = useState("");
  const [inputFocus, setInputFocus] = useState(false);
  const [loading, setLoading] = useState(false);

  const onTitleChange = (e: React.ChangeEvent<HTMLInputElement>) => setTitle(e.target.value);
  const onContentChange = (e: React.ChangeEvent<HTMLTextAreaElement>) => setContent(e.target.value);
  const nameKeyPress = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === "Enter") {
      if (searchUsers.length == 1) {
        if (editString == "") {
          setJapdoriTo(null);
        } else {
          setJapdoriTo(searchUsers[0]);
          console.log(japdoriTo, "등록");
          setEditable(false);
        }
      }
    }
  }
  const submitJapdori = async (japdoriFrom: User, japdoriTo: User, title: string, content: string, teamId: string) => {
    if (japdoriFrom && japdoriTo && title != "" && content != "" && teamId != "") {
      await addJapdori(japdoriFrom, japdoriTo, title, content, teamId);
      const japdoriesRes: Japdori[] = await fetchTeamJapdori("도다리도 뚜뚜려보고 건너는 양털");
      if (japdoriesRes) {
        japdoriesRes.sort((a, b) => (new Date(b.created_at)).getTime() - (new Date(a.created_at).getTime()));
      }
      setJapdories(japdoriesRes);
      setAddJapdoriOverlay(false);
    }
  }

  useEffect(() => {
    (async() => {
      const users: User[] = await fetchTeamUsers("도다리도 뚜뚜려보고 건너는 양털");
      setTeamUsers(users);
      setSearchUsers(users);
    })();
  }, []);

  return <motion.div
    initial={{ opacity: 0.6, scale: 0.8, filter: "blur(10px)" }}
    animate={{ opacity: 1, scale: 1, filter: "blur(0px)" }}
    exit={{ opacity: 0, scale: 0.8, filter: "blur(10px)" }}
    transition={roundTransition}
    className={"z-20 rounded-2xl bg-white w-[50%] p-10 flex flex-col space-y-5"} layoutId={"overlay"}>
    <motion.div
      className={"flex justify-between mb-5 items-center"}>
      <div className={"flex space-x-2.5"}>
        <p className={"font-black text-2xl"}>잡도리하기</p>
      </div>
      <div className={"flex space-x-2.5"}>
        <div className={""}>
          {
            !editable
              ? <div className={"flex space-x-2.5 hover:bg-gray-100 rounded-lg p-3 cursor-pointer"} onClick={() => {
                setEditable(true);
                setJapdoriTo(null);
                setSearchUsers(teamUsers);
              }}>
                <div className={"flex flex-col text-end"}>
                  <p className={"font-semibold"}>{japdoriTo ? japdoriTo?.name : ""}님에게 전달</p>
                  <p className={"text-sm text-gray-700"}>{japdoriTo ? japdoriTo?.email : ""}</p>
                </div>
                <Image src={"/pencil.svg"} className={""} alt={"logo"} width={20} height={20} />
              </div>
              : <div className={"relative"}>
                <div className={"flex space-x-2.5"}>
                  <input type={"text"} placeholder={"잡도리할 사람을 입력하세요"} className={"border-gray-300 rounded-lg p-3 border-[1px]"} onFocus={() => { setInputFocus(true) }} onBlur={() => {
                    setTimeout(() => setInputFocus(false), 100);
                  }} onChange={(e => {
                    setEditString(e.target.value);
                    if (e.target.value == "") {
                      setSearchUsers(teamUsers);
                    } else {
                      setSearchUsers(teamUsers.filter((user) => {
                        const disassembled = Hangul.disassemble(user.name).join("");
                        const queryDisassembled = Hangul.disassemble(e.target.value).join("");
                        return disassembled.includes(queryDisassembled);
                      }));
                    }
                  })} defaultValue={japdoriTo?.name} onKeyDown={nameKeyPress} />
                  <IconTextButton text={"등록"} src={"/check.svg"} onClick={() => {
                    if (searchUsers.length == 1) {
                      if (editString == "") {
                        setJapdoriTo(null);
                      } else {
                        setJapdoriTo(searchUsers[0]);
                        console.log(japdoriTo, "등록");
                        setEditable(false);
                      }
                    }
                  }} />
                </div>
                <AnimatePresence>
                  { inputFocus && <motion.div className={"absolute bg-white border-[1px] border-gray-300 w-full"} initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}>
                    { searchUsers.length != 0
                      ? searchUsers.map((user: User) => <div key={user.email} className={"p-3 hover:bg-gray-100"} onClick={() => {
                        setJapdoriTo(user);
                        setEditable(false);
                      }}>{user.name}</div>)
                      : <p className={"p-3 font-semibold text-gray-500"}>검색 결과가 없어요.</p>
                    }
                  </motion.div> }
                </AnimatePresence>
              </div>
          }
        </div>

      </div>
    </motion.div>
    <div className={"border-gray-300 border-[1px] rounded-lg flex flex-col w-full]"}>
      <input type={"text"} placeholder={"어떤 것을 잡도리할까요?"} onChange={onTitleChange} className={"p-5 font-semibold text-lg rounded-lg rounded-b-none w-full"} />
      <div className={"w-full h-[1px] bg-gray-300"}></div>
      <textarea placeholder={"잡도리할 내용을 적어주세요."} onChange={onContentChange} className={"p-5 rounded-lg rounded-t-none w-full min-h-52"} />
    </div>
    <div className={"flex w-full justify-end space-x-2.5"}>
      <button className={"w-fit rounded-lg bg-white text-gray-700 font-bold px-5 py-3 border-[1px] border-gray-300 hover:bg-gray-100"} onClick={() => setAddJapdoriOverlay(false)}>취소</button>
      <motion.button className={`w-36 flex justify-center items-center rounded-lg font-bold px-5 py-3 border-[1px] duration-100 ${japdoriTo && title != "" && content != "" ? "border-gray-800 text-white bg-gray-800" : "border-gray-300 bg-gray-300 text-gray-500"}`} onClick={async () => {
        if (!loading) {
          setLoading(true);
          await submitJapdori(me!, japdoriTo!, title, content, me!.team_id!).then((res) => {
            setLoading(false);
          });
        }
      }}>{
        loading
          ? <div className={"w-5 h-5"}><CircularLoader/></div>
          : <div className={"flex space-x-2.5 items-center justify-center"}>
            {
              japdoriTo && title != "" && content != "" && <AnimatePresence>
                <motion.div className={""} initial={{ opacity: 0, scale: 0.8 }} animate={{ opacity: 1, scale: 1 }} exit={{ opacity: 0, scale: 0 }}>
                  <Image src={"/paper-airplane.svg"} alt={""} className={"-rotate-45"} width={15} height={15} />
                </motion.div>
              </AnimatePresence>
            }
            <motion.p layoutId={"button-submit"}>잡기</motion.p></div>
      }</motion.button>
    </div>
  </motion.div>
}

export default JapdoriPage;