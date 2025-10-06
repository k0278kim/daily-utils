"use client"

import React, {ChangeEventHandler, useEffect, useRef, useState} from "react";
import fetchTeamUsers from "@/app/api/fetch_team_users";
import {useSession} from "next-auth/react";
import {User} from "@/model/user";
import Image from "next/image";
import fetchTeamPraise from "@/app/api/praise/fetch_team_praise/fetchTeamPraise";
import {Praise} from "@/model/praise";
import IconTextButton from "@/components/IconTextButton";
import fetchUserByEmail from "@/app/api/team/user/get_user_by_email/fetch_user_by_email";
import Hangul from "hangul-js";
import CircularLoader from "@/components/CircularLoader";
import {AnimatePresence, motion} from "framer-motion";
import formatDate from "@/lib/utils/format_date";
import {addPraise} from "@/app/actions/addPraise";
import {roundTransition} from "@/app/transition/round_transition";
import {easeInOutTranstion} from "@/app/transition/ease_transition";
import _ from "lodash";
import LoadOrLogin from "@/components/LoadOrLogin";

const PraisesPage = () => {

  const [users, setUsers] = useState([]);
  const { data: session } = useSession();
  const [praises, setPraises] = useState<Praise[]>([]);
  const [addPraiseOverlay, setAddPraiseOverlay] = useState(false);
  const [selectedUser, setSelectedUser] = useState<User | null>(null);
  const [me, setMe] = useState<User>();
  const [myPraises, setMyPraises] = useState<Praise[]>([]);
  const [loadOverflow, setLoadOverflow] = useState(false);

  useEffect(() => {
    (async() => {
      if (session) {
        const users = await fetchTeamUsers("도다리도 뚜뚜려보고 건너는 양털");
        const praisesRes: Praise[] = await fetchTeamPraise("도다리도 뚜뚜려보고 건너는 양털");
        setUsers(users);
        console.log(praisesRes);
        setPraises(praisesRes.sort((a, b) => (new Date(b.created_at)).getTime() - (new Date(a.created_at).getTime())));
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
    if (praises && selectedUser) {
      const myPraises = praises.filter((praise) => praise.praise_to.email == selectedUser!.email);
      setMyPraises(myPraises);
      myPraises.map((praise) => praise["created_at"] = formatDate(new Date(praise.created_at)) as string);
      myPraises.sort((a, b) => (new Date(b.created_at)).getTime() - (new Date(a.created_at).getTime()))
      console.log(_.groupBy(myPraises, "created_at"));
    }
  }, [selectedUser, praises]);

  if (!session) return <LoadOrLogin loadOverflow={loadOverflow} setLoadOverflow={setLoadOverflow} />

  return <div className={"w-full h-full flex relative bg-gray-900"}>
    <AnimatePresence>
    {
      addPraiseOverlay && <motion.div className={`fixed flex w-full h-full items-center justify-center bg-black/20 z-20 duration-1000 ${addPraiseOverlay ? "backdrop-blur-xl" : ""}`} transition={roundTransition} exit={{ opacity: 0 }}>
        <AddPraiseOverlay setPraises={setPraises} praiseFromEmail={session?.user?.email} setAddPraiseOverlay={setAddPraiseOverlay} me={me} setMe={setMe} />
      </motion.div>
    }
    </AnimatePresence>
    <motion.div className={`z-0 w-full h-full flex relative duration-500 ${addPraiseOverlay ? "scale-90" : ""}`}>
      <div className={`z-50 w-72 h-full border-r-[1px] border-r-gray-800 p-3 flex flex-col space-y-5 text-white bg-gray-800 fixed left-0 duration-1000 ${addPraiseOverlay ? "rounded-l-4xl" : ""}`}>
        <div className={"mt-5 mb-5 mx-3"}>
          {/*<p className={"font-semibold text-2xl mb-5 text-gray-300"}>칭찬 챌린지</p>*/}
          <IconTextButton src={"/plus.svg"} className={"text-gray-300"} text={"칭찬하기"} onClick={() => setAddPraiseOverlay(true)} darkmode={true} />
        </div>
        <div className={"flex flex-col"}>{
          users.map((user: User) => <UserBlock key={user.email} user={user} selectedUser={selectedUser ? selectedUser : me} setSelectedUser={setSelectedUser} praisesNumber={praises.filter((praise) => praise.praise_to.email == user.email).length} />)
        }</div>
      </div>
      <div className={"w-72"}></div>
      <AnimatePresence>
        { selectedUser != undefined && myPraises.length > 0 &&
          <motion.div
            initial={{ opacity: 0, translateX: "-100%" }}
            animate={{ opacity: 1, translateX: "0%" }}
            exit={{ opacity: 0, translateX: "-100%" }}
            transition={easeInOutTranstion}
            className={"w-72 bg-gray-800/50 overflow-y-scroll scrollbar-hide"}>
            <div className={""}>
              <div className={"font-semibold text-gray-300 text-lg px-5 pt-10 pb-3"}>모아보기</div>
              {
                myPraises.map((praise: Praise, index) => <div key={"praise_summary_" + praise.id} className={"cursor-pointer p-5 text-gray-300 hover:bg-gray-800/70 flex space-x-2.5"}
                  onClick={() => {
                    window.location.hash = `#praise_block_${praise.id}`;
                    const hash = window.location.hash;
                    if (hash) {
                      const el = document.querySelector(hash);
                      if (el) {
                        el.scrollIntoView({behavior: "smooth"});
                      }
                    }
                  }}
                >
                  <div className={"w-7 text-xl font-semibold text-gray-300"}>{myPraises.length - index}</div>
                  <div className={"flex flex-col space-y-2.5 flex-1"}>
                    <p className={""}>{praise.title}</p>
                    <p className={"text-sm text-gray-500"}>{praise.praise_from.name} · {formatDate(new Date(praise.created_at))}</p>
                  </div>
                </div>)
              }
            </div>
          </motion.div>
        }
      </AnimatePresence>

      <div className={`flex-1 w-full h-full bg-gray-900 flex justify-center overflow-y-scroll duration-500 scrollbar-hide ${addPraiseOverlay ? "rounded-r-4xl" : ""}`}>{
        selectedUser != undefined
          ? myPraises.length > 0
            ? <div className={"w-[60%] min-w-[300px] py-20 space-y-12"}>
              {
              myPraises.map((praise: Praise) =>
                <PraiseBlock key={praise.id} praise_id={praise.id} praise_from={praise.praise_from} praise_to={praise.praise_to} title={praise.title} content={praise.content} created_at={new Date(praise.created_at)} />
              )}
            </div>
            : <motion.div
              initial={{ opacity: 0, translateY: 10 }}
              animate={{ opacity: 1, translateY: 0 }}
              transition={{ delay: 0.3, duration: 0.5 }}
              className={"text-gray-500 font-semibold text-2xl items-center h-full flex justify-center"}>아직 받은 칭찬이 없어요.</motion.div>
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
  praisesNumber: number
}
const UserBlock = ({ user, selectedUser, setSelectedUser, praisesNumber }: userBlockType) => {
  return <div className={`flex items-center justify-between cursor-pointer w-full h-fit px-5 py-3 rounded-lg hover:bg-gray-700 ${selectedUser?.uuid === user.uuid ? "bg-gray-900" : ""}`} onClick={() => setSelectedUser(user)}>
    <div className={"flex flex-col"}>
      <p className={"font-semibold text-gray-300"}>{user.name}</p>
      <p className={"text-gray-400 text-sm"}>{user.nickname}</p>
    </div>
    <div className={`w-7 h-7 flex items-center justify-center text-white/70 font-bold rounded-full ${selectedUser?.uuid == user.uuid ? "bg-gray-800" : "bg-gray-700"}`}>{praisesNumber}</div>
  </div>
}

type praiseBlockType = {
  praise_id: string;
  praise_from: User;
  praise_to: User;
  title: string;
  content: string;
  created_at: Date;
}

const PraiseBlock = ({ praise_id, praise_from, praise_to, title, content, created_at }: praiseBlockType) => {
  return <motion.div
    initial={{ opacity: 0, scale: 0.95 }}
    animate={{ opacity: 1, scale: 1 }}
    transition={roundTransition}
    className={"flex flex-col space-y-5 text-white"} layoutId={"praise_block_"+praise_id}>
    <div className={"flex justify-between items-center"} id={"praise_block_"+praise_id}>
      <div className={"flex space-x-5 items-center"}>
        <div className={"rounded-lg bg-gray-600 w-10 aspect-square flex items-center justify-center"}>
          <Image src={"/user.svg"} width={20} height={20} alt={""} />
        </div>
        <div className={"flex flex-col"}>
          <p className={"font-bold text-lg text-gray-300"}>{praise_from.name}</p>
          <p className={"opacity-60"}>{praise_from.nickname}</p>
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

type addPraiseOverlayType = {
  setPraises: (praises: Praise[]) => void;
  praiseFromEmail: string | null | undefined;
  setAddPraiseOverlay: (newAddPraiseOverlay: boolean) => void;
  me: User | undefined;
  setMe: (newMe: User | undefined) => void;
}

const AddPraiseOverlay = ({ setPraises, praiseFromEmail, setAddPraiseOverlay, me, setMe }: addPraiseOverlayType) => {
  const [praiseTo, setPraiseTo] = useState<User | null>(null);
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
          setPraiseTo(null);
        } else {
          setPraiseTo(searchUsers[0]);
          console.log(praiseTo, "등록");
          setEditable(false);
        }
      }
    }
  }
  const submitPraise = async (praiseFrom: User, praiseTo: User, title: string, content: string, teamId: string) => {
    if (praiseFrom && praiseTo && title != "" && content != "" && teamId != "") {
      await addPraise(praiseFrom, praiseTo, title, content, teamId);
      const praisesRes: Praise[] = await fetchTeamPraise("도다리도 뚜뚜려보고 건너는 양털");
      praisesRes.sort((a, b) => (new Date(b.created_at)).getTime() - (new Date(a.created_at).getTime()))
      console.log(praisesRes);
      setPraises(praisesRes);
      setAddPraiseOverlay(false);
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
        <p className={"font-black text-2xl"}>새로운 칭찬 전달하기</p>
      </div>
      <div className={"flex space-x-2.5"}>
        <div className={""}>
          {
            !editable
            ? <div className={"flex space-x-2.5 hover:bg-gray-100 rounded-lg p-3 cursor-pointer"} onClick={() => {
              setEditable(true);
              setPraiseTo(null);
              setSearchUsers(teamUsers);
            }}>
                <div className={"flex flex-col text-end"}>
                  <p className={"font-semibold"}>{praiseTo ? praiseTo?.name : ""}님에게 전달</p>
                  <p className={"text-sm text-gray-700"}>{praiseTo ? praiseTo?.email : ""}</p>
                </div>
                <Image src={"/pencil.svg"} className={""} alt={"logo"} width={20} height={20} />
              </div>
            : <div className={"relative"}>
                <div className={"flex space-x-2.5"}>
                  <input type={"text"} placeholder={"칭찬할 사람을 입력하세요"} className={"border-gray-300 rounded-lg p-3 border-[1px]"} onFocus={() => { setInputFocus(true) }} onBlur={() => {
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
                  })} defaultValue={praiseTo?.name} onKeyDown={nameKeyPress} />
                  <IconTextButton text={"등록"} src={"/check.svg"} onClick={() => {
                    if (searchUsers.length == 1) {
                      if (editString == "") {
                        setPraiseTo(null);
                      } else {
                        setPraiseTo(searchUsers[0]);
                        console.log(praiseTo, "등록");
                        setEditable(false);
                      }
                    }
                  }} />
                </div>
                <AnimatePresence>
                  { inputFocus && <motion.div className={"absolute bg-white border-[1px] border-gray-300 w-full"} initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}>
                    { searchUsers.length != 0
                      ? searchUsers.map((user: User) => <div key={user.email} className={"p-3 hover:bg-gray-100"} onClick={() => {
                        setPraiseTo(user);
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
      <input type={"text"} placeholder={"어떤 것을 칭찬할까요?"} onChange={onTitleChange} className={"p-5 font-semibold text-lg rounded-lg rounded-b-none w-full"} />
      <div className={"w-full h-[1px] bg-gray-300"}></div>
      <textarea placeholder={"칭찬할 내용을 적어주세요."} onChange={onContentChange} className={"p-5 rounded-lg rounded-t-none w-full min-h-52"} />
    </div>
    <div className={"flex w-full justify-end space-x-2.5"}>
      <button className={"w-fit rounded-lg bg-white text-gray-700 font-bold px-5 py-3 border-[1px] border-gray-300 hover:bg-gray-100"} onClick={() => setAddPraiseOverlay(false)}>취소</button>
      <motion.button className={`w-36 flex justify-center items-center rounded-lg font-bold px-5 py-3 border-[1px] duration-100 ${praiseTo && title != "" && content != "" ? "border-gray-800 text-white bg-gray-800" : "border-gray-300 bg-gray-300 text-gray-500"}`} onClick={async () => {
        if (!loading) {
          setLoading(true);
          await submitPraise(me!, praiseTo!, title, content, me!.team_id!).then((res) => {
            setLoading(false);
          });
        }
      }}>{
        loading
          ? <div className={"w-5 h-5"}><CircularLoader/></div>
          : <div className={"flex space-x-2.5 items-center justify-center"}>
            {
              praiseTo && title != "" && content != "" && <AnimatePresence>
                <motion.div className={""} initial={{ opacity: 0, scale: 0.8 }} animate={{ opacity: 1, scale: 1 }} exit={{ opacity: 0, scale: 0 }}>
                  <Image src={"/paper-airplane.svg"} alt={""} className={"-rotate-45"} width={15} height={15} />
                </motion.div>
              </AnimatePresence>
            }
          <motion.p layoutId={"button-submit"}>칭찬하기</motion.p></div>
      }</motion.button>
    </div>
  </motion.div>
}

export default PraisesPage;