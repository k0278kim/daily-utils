"use client"
import React, {Dispatch, SetStateAction, useEffect, useRef, useState} from "react";
import formatDate from "@/lib/utils/format_date";
import CircularLoader from "@/components/CircularLoader";
import IconTextButton from "@/components/IconTextButton";
import {driveUploadFile} from "@/app/api/drive_upload_file";
import {signIn, useSession} from "next-auth/react";
import {driveGetFolder} from "@/app/api/drive_get_folder";
import {driveDeleteFile} from "@/app/api/drive_delete_file";
import LoadOrLogin from "@/components/LoadOrLogin";
import {healthcheckDriveId} from "@/app/data/drive_id";
import {DriveFolder} from "@/model/driveFolder";
import {driveGetFile} from "@/app/api/drive_get_file";
import fetchHealthcheckQuestions from "@/app/api/healthcheck/fetch_questions/fetchHealthcheckQuestions";
import {HealthcheckQuestions} from "@/model/healthcheckQuestions";
import { motion } from "framer-motion";
import {roundTransition} from "@/app/transition/round_transition";
import fetchUserHealthchecks from "@/app/api/healthcheck/fetch_user_healthchecks/fetchUserHealthchecks";
import fetchUserByEmail from "@/app/api/team/user/get_user_by_email/fetch_user_by_email";
import {User} from "@/model/user";
import {Healthcheck, HealthcheckResponse} from "@/model/healthcheck";
import {addUserHealthcheck} from "@/app/actions/addUserHealthcheck";
import {updateUserHealthcheck} from "@/app/actions/updateUserHealthcheck";

const DailyHealthcheckEdit = () => {
  const { data: session } = useSession();
  const [submitText, setSubmitText] = useState<string>("발행하기");
  const [selectedDate, setSelectedDate] = useState("");
  const [healthchecks, setHealthchecks] = useState<DriveFolder[] | []>([]);
  const [isUploading, setIsUploading] = useState(false);
  const [loadStatus, setLoadStatus] = useState(false);
  const [loadOverflow, setLoadOverflow] = useState(false);
  const [disabled, setDisabled] = useState<boolean>(false);
  const dateRef = useRef<string | null>(null);
  const [questions, setQuestions] = useState<string[]>([]);
  const [me, setMe] = useState<User | null>(null);
  const [myHealthcheck, setMyHealthcheck] = useState<Healthcheck | null>(null);
  const [writeScore, setWriteScore] = useState<number[]>([]);
  const [writeComment, setWriteComment] = useState<string[]>([]);
  const [init, setInit] = useState<boolean>(true);
  const [retouched, setRetouched] = useState<boolean>(false);

  const onCommentChange = (str: string, index: number) => {
    console.log(str, index);
    setWriteComment(prev => prev.map((v, i) => (i === index ? str : v)));
    console.log(writeComment);
    setRetouched(true);
  }

  const dailySnippetAvailableDate = () => {
    const now = new Date();
    const yesterday = new Date();
    if (now.getHours() < 9) {
      yesterday.setDate(yesterday.getDate() - 1)
      return [formatDate(yesterday), formatDate(now)]
    } else {
      return [formatDate(now)]
    }
  }

  useEffect(() => {
    const availableDate = dailySnippetAvailableDate();
    setSelectedDate(availableDate[0]!);
  }, []);

  useEffect(() => {
    if (init) {
      setLoadStatus(false);
      setDisabled(true);
      (async() => {
        if (session) {
          const questions: HealthcheckQuestions = await fetchHealthcheckQuestions("도다리도 뚜뚜려보고 건너는 양털");
          setQuestions(questions.questions);
          if (!me) {
            console.log("not me", me);
            const meRes: User[] = await fetchUserByEmail(session.user?.email as string);
            console.log("setme", meRes[0]);
            setMe(meRes[0]);
          }
          if (me) {
            const todayAnswer: Healthcheck[] = await fetchUserHealthchecks(me!.uuid, selectedDate!, selectedDate!);
            if (todayAnswer.length == 1) {
              setMyHealthcheck(todayAnswer[0]);
              if (init) {
                setWriteScore(todayAnswer[0].responses.map((res) => res.score))
                console.log(todayAnswer[0].responses.map((res) => res.answer), todayAnswer[0].responses.map((res) => res.score))
                const answerMap = todayAnswer[0].responses.map((res) => res.answer)
                setWriteComment(answerMap);
                setInit(false);
              }
            } else {
              if (init) {
                setWriteComment(Array.from({ length: questions.questions.length }, (_, i) => ""));
                setWriteScore(Array.from({ length: questions.questions.length }, (_, i) => 4));
              }
            }
            setLoadStatus(true);
          }
        }
        if (!isUploading) {
          setDisabled(false);
        }
      })();
    }

  }, [session, me]);

  useEffect(() => {
    setLoadStatus(false);
    (async () => {
      if (session && me) {
        const todayAnswer: Healthcheck[] = await fetchUserHealthchecks(me!.uuid, selectedDate!, selectedDate!);
        if (todayAnswer.length == 1) {
          setMyHealthcheck(todayAnswer[0]);
          setWriteScore(todayAnswer[0].responses.map((res) => res.score))
          console.log(todayAnswer[0].responses.map((res) => res.answer), todayAnswer[0].responses.map((res) => res.score))
          const answerMap = todayAnswer[0].responses.map((res) => res.answer)
          setWriteComment(answerMap);
          setInit(false);
        } else {
          setMyHealthcheck(null);
          setWriteComment(Array.from({ length: questions.length }, (_, i) => ""));
          setWriteScore(Array.from({ length: questions.length }, (_, i) => 4));
        }
        setLoadStatus(true);
      }
    })();
  }, [selectedDate]);

  useEffect(() => {
    setTimeout(() => {
      setLoadOverflow(true);
    }, 3000);
  }, [])

  if (!session) return <LoadOrLogin loadOverflow={loadOverflow} setLoadOverflow={setLoadOverflow} />

  return <div className={"w-full h-full bg-gray-100"}>
    <div className={"flex flex-col px-10 h-full space-y-10"}>
      <div className={"sticky top-0 py-5 bg-gray-100 z-20 flex h-fit space-x-2.5 md:space-x-0"}>
        <div className={"flex flex-col space-y-2.5 md:space-y-0 md:flex-row md:space-x-2.5"}>
          {
            dailySnippetAvailableDate().map((date) => {
              const dateSplit = date!.split("-");
              const fold: DriveFolder[] = healthchecks.filter((df: DriveFolder) => `${df.name.split("_")[0]}_${df.name.split("_")[1]}` == `${date}_${session?.user?.email}`);
              return <button
                key={date}
                onClick={async () => {
                  if (loadStatus) {
                    setSelectedDate(date!);
                    setDisabled(true);
                    dateRef.current = date;
                    if (fold.length == 1) {
                      const getFile = await driveGetFile(session?.accessToken, fold[0].id);

                    } else {
                    }
                    setDisabled(false);
                  }
                }}
                className={`text-sm flex items-center space-x-2.5 rounded-lg p-3 border-[1px] cursor-pointer ${!loadStatus ? "bg-gray-200 text-gray-500" : selectedDate == date ? "bg-white border-gray-200" : "border-transparent text-gray-600"} font-bold`}>
                <p>{`${dateSplit[0]}년 ${dateSplit[1]}월 ${dateSplit[2]}일`}</p>
                <div className={"w-4 aspect-square flex items-center justify-center"}>
                {
                  isUploading || !loadStatus
                    ? <div className={"w-4 aspect-square"}><CircularLoader/></div>
                    : <div className={`w-2 aspect-square rounded-full ${selectedDate == date ? myHealthcheck && !retouched ? "bg-green-500" : "bg-gray-400" : ""}`}></div>
                }
                </div>

              </button>
            })
          }
        </div>
        <div className={"flex space-y-2.5 md:space-y-0 md:space-x-2.5 flex-1 md:justify-end flex-col md:flex-row"}>
          <IconTextButton src={"/arrow-path.svg"} text={"초기화"} onClick={() => {
            const confirm = window.confirm("작성하시던 내용을 초기화하시겠습니까?");
            if (confirm) {
              setRetouched(true);
              setWriteComment(Array.from({ length: questions.length }, (_, i) => ""));
              setWriteScore(Array.from({ length: questions.length }, (_, i) => 4));
            }
          }} />
          <IconTextButton src={"/globe.svg"} text={"임시저장"} onClick={() => {
            const confirm = window.confirm("지금 상태로 헬스체크를 임시저장할까요?");
            if (confirm) {
              window.localStorage.setItem(`healthcheck__tempsave__${selectedDate!}`, writeComment.join("/*/*/"));
              window.localStorage.setItem(`healthcheck__tempsave__score__${selectedDate!}`, writeScore.join("/*/*/"));
            }
          }} />
          <IconTextButton src={"/globe.svg"} text={"임시저장 불러오기"} onClick={() => {
            const result = window.localStorage.getItem(`healthcheck__tempsave__${selectedDate!}`);
            const resultScore = window.localStorage.getItem(`healthcheck__tempsave__score__${selectedDate!}`);
            if (result && resultScore) {
              const confirm = window.confirm("임시저장한 헬스체크를 불러올까요?");
              if (confirm) {
                setWriteComment(result.split("/*/*/"));
                console.log(resultScore.split("/*/*/").map((s) => Number(s)))
                setWriteScore(resultScore.split("/*/*/").map((s) => Number(s)));
              }
            } else {
              window.alert("임시저장한 헬스체크가 없어요.");
            }
          }} />
          <button className={`text-sm rounded-lg font-semibold flex w-fit px-5 items-center justify-center ${isUploading ? "text-gray-300 bg-gray-500" : "text-white bg-gray-800"}`} onClick={async () => {
            if (!isUploading && session?.user?.email != "") {
              setDisabled(true);
              const email = session?.user?.email as string;
              setIsUploading(true);
              console.log(myHealthcheck, me);
              const body: HealthcheckResponse[] = [];
              for (let i = 0; i < questions.length; i++) {
                body.push({
                  question: questions[i],
                  answer: writeComment[i],
                  score: writeScore[i]
                });
              }
              console.log(body);
              if (me) {
                const todayAnswer: Healthcheck[] = await fetchUserHealthchecks(me!.uuid, selectedDate!, selectedDate!);
                if (todayAnswer.length == 0) {
                  console.log("add healthcheck");
                  try {
                    await addUserHealthcheck("도다리도 뚜뚜려보고 건너는 양털", me?.uuid, selectedDate!, body);
                  } catch (e) {
                    const confirm = window.confirm("계정 세션에 문제가 발생했습니다. 지금 상태로 헬스체크를 임시저장할까요?");
                    if (confirm) {
                      window.localStorage.setItem(`healthcheck__tempsave__${selectedDate!}`, writeComment.join("/*/*/"));
                      window.localStorage.setItem(`healthcheck__tempsave__score__${selectedDate!}`, writeScore.join("/*/*/"));
                    }
                  }
                } else {
                  console.log("update healthcheck", body);
                  await updateUserHealthcheck("도다리도 뚜뚜려보고 건너는 양털", me?.uuid, selectedDate!, body);
                }
              }
              const myDriveList = (await driveGetFolder(healthcheckDriveId)).filter((f: { id: string, name: string } ) => f.name == `${selectedDate!}_${email}`);
              if (myDriveList.length == 0) {
                setSubmitText("Google Drive에 파일이 업로드되어 있지 않아서 업로드하고 있어요")
              } else {
                setSubmitText("Google Drive에서 파일 정리 중")
                for await (const file of myDriveList) {
                  await driveDeleteFile(file.id);
                }
              }
              setSubmitText("Google Drive에 파일 업로드 중")
              await driveUploadFile(healthcheckDriveId, `${selectedDate!}_${email}`, body.map((b) => `### ${b.question}\n\n- ${b.answer}`).join("\n\n"));
              setSubmitText("업로드 완료");
              window.localStorage.removeItem(`healthcheck__tempsave__${selectedDate!}`);
              window.localStorage.removeItem(`healthcheck__tempsave__score__${selectedDate!}`);
              setDisabled(false);
              setTimeout(() => {
                setIsUploading(false);
                setSubmitText("업로드 시작");
              }, 2000);
            }
          }}>{ isUploading ? <div className={"flex space-x-2.5"}>
            <div className={"w-5 aspect-square"}><CircularLoader/></div>
            <p>{submitText}</p>
          </div> : myHealthcheck ? "업데이트" : "발행"}</button>
        </div>
      </div>
      <div className={"flex-1 relative"}>
        <div className={"w-full h-full flex flex-col space-y-20 pb-20"}>
          { !isUploading && loadStatus &&
            questions.map((question, i) => <div key={question} className={"w-full h-full flex flex-col space-y-10"}>
              <HealthcheckEditCard question={question} comment={writeComment[i]} onCommentChange={onCommentChange} disabled={disabled} writeScore={writeScore} setWriteScore={setWriteScore} index={i} />
              { i <= question.length - 1 && <div className={"w-full h-[1px] bg-gray-300"}></div> }
            </div>)
          }
        </div>
        {/*<HealthcheckEditor content={checkContent} onSnippetChange={onContentChange} disabled={disabled} />*/}
      </div>
    </div>
  </div>
}

type healthcheckEditorType = {
  content: string,
  onSnippetChange: (value: string) => void;
  disabled: boolean;
}

type healthcheckEditCardType = {
  question: string;
  comment: string;
  onCommentChange: (value: string, index: number) => void;
  disabled: boolean;
  writeScore: number[];
  setWriteScore: Dispatch<SetStateAction<number[]>>;
  index: number;
}

const HealthcheckEditCard = ({ question, comment, onCommentChange, disabled, writeScore, setWriteScore, index }:healthcheckEditCardType) => {
  return <div className={"flex space-y-10 md:space-y-0 md:space-x-10 flex-col md:flex-row"}>
    <div className={"flex-2 flex flex-col space-y-5"}>
      <p className={"text-2xl font-semibold"}>{question}</p>
      <div className={"w-full h-10 flex items-center justify-between rounded-full border-[1px] border-gray-300 bg-gradient-to-r from-blue-100 to-red-100"}>
        {Array.from({ length: 9 }, (_, index) => index).map((_, i) =>
          <div key={question+"_"+i} className={"flex items-center justify-center w-full h-full relative"}>
            { writeScore[index] == i && <motion.div transition={roundTransition} layoutId={"block-bg"+question} className={"w-full h-full bg-white rounded-full border-[1px] border-gray-300 absolute"}></motion.div>}
            <motion.div key={i} className={`cursor-pointer active:scale-90 active:bg-black/20 z-10 flex items-center justify-center duration-100 rounded-full w-full h-full`} onClick={() => setWriteScore([...writeScore.slice(0, index), i, ...writeScore.slice(index + 1, writeScore.length + 1)])}>
              <p>{i+1}</p>
            </motion.div>
          </div>
        )}
      </div>
      <p className={"text-center"}>{[
        "팀 나가겠습니다.",
        "샤갈 장난치냐?",
        "욕 나오기 직전이에요.",
        "오늘 좀 아쉬웠어요.",
        "무난무난하게 잘 흘러갔어요.",
        "오늘 좋았어요!",
        "오늘 행복했어요! 일기장에 적어두고 싶을만큼이요.",
        "진짜 말이 안돼요. 평생 기억에 남을 것 같아요.",
        "우리 팀 투자받았어요!!"
      ][writeScore[index]]}</p>
    </div>
    <div className={"flex-3"}>
      <textarea value={comment} placeholder={"'" + question + "' 에 대한 구체적인 경험을 공유해주세요."} className={"w-full h-full border-[1px] border-gray-300 p-7 rounded-2xl bg-white"} onChange={(e) => onCommentChange(e.target.value, index)} />
    </div>
  </div>
}

export default DailyHealthcheckEdit;