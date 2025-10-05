"use client"
import React, {useEffect, useState} from "react";
import Editor from "@/components/MdEditor";
import formatDate from "@/lib/utils/format_date";
import {Snippet} from "@/model/snippet";
import CircularLoader from "@/components/CircularLoader";
import IconTextButton from "@/components/IconTextButton";
import {driveUploadFile} from "@/app/api/drive_upload_file";
import {signIn, useSession} from "next-auth/react";
import {driveGetFile} from "@/app/api/drive_get_file";
import {driveDeleteFile} from "@/app/api/drive_delete_file";
import LoadOrLogin from "@/components/LoadOrLogin";
import {useRouter} from "next/navigation";
import {healthcheckDriveId} from "@/app/data/drive_id";

const DailyHealthcheckEdit = () => {
  const template = `1점 : 팀 나가겠습니다
  
2점 : 샤갈 장난치냐?

3점 : 욕 나오기 직전이야

4점 : 오늘 좀 아쉬웠어

5점 : 무난무난 잘 흘러 갔어.

6점 : 오늘 좋았어! 

7점 : 오늘 행복했어! 진짜 일기장에 적어두고 싶어

8점 : 진짜 말 안됨. 평생 기억에 남을 거야

9점 : 진짜 우리팀 투자 받음. 교수님한테 컨택 받거나 뭐 쨌든 미쳤음

10점 : 하룰랄라

### Fun(재밌었는가?)
- 

### Pawn or Players(시켜서 했는가? 능동적으로 했는가?)
- 

### Speed(빠르게 일이나 회의를 끝냈는가?)
- 

### Suitable Process(업무 방식이 본인에게 맞는가?)
- 

### Teamwork(우린 팀 분위기가 좋은가?)
- 

### 건의사항
-
`;
  const { data: session } = useSession();
  const [submitText, setSubmitText] = useState<string>("발행하기");
  const [snippetContent, setSnippetContent] = useState(template);
  const [selectedDate, setSelectedDate] = useState(formatDate(new Date()));
  const [snippets, setSnippets] = useState([]);
  const [isUploading, setIsUploading] = useState(false);
  const [loadStatus, setLoadStatus] = useState(false);
  const [loadOverflow, setLoadOverflow] = useState(false);

  const router = useRouter();

  const onSnippetChange = (str: string) => {
    setSnippetContent(str);
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
    setLoadStatus(false);
    (async() => {
      if (session) {
        await driveGetFile(healthcheckDriveId).then((res) => {
          setSnippets(res);
          console.log(res);
          const snip: Snippet[] = res.filter((sn: Snippet) => sn.snippet_date == selectedDate);
          if (snip.length == 1) {
            setSnippetContent(snip[0].content);
          }
          setLoadStatus(true);
        });
      }
    })();

  }, [session]);

  useEffect(() => {
    setTimeout(() => {
      setLoadOverflow(true);
    }, 3000);
  }, [])

  if (!session) return <LoadOrLogin loadOverflow={loadOverflow} setLoadOverflow={setLoadOverflow} />

  return <div className={"w-screen h-screen bg-gray-100"}>
    <div className={"flex flex-col md:p-20 h-full space-y-10"}>
      <div className={"flex h-12"}>
        <div className={"flex space-x-2.5"}>
          {
            dailySnippetAvailableDate().map((date) => {
              const dateSplit = date!.split("-");
              const snippet: Snippet[] = snippets.filter((snip: Snippet) => snip.snippet_date == date);
              return <button
                key={date}
                onClick={() => {
                  if (loadStatus) {
                    setSelectedDate(date!);
                    if (snippet.length == 1) {
                      setSnippetContent(snippet[0].content);
                    } else {
                      setSnippetContent(template);
                    }
                  }
                }}
                className={`flex items-center space-x-2.5 rounded-lg p-3 border-[1px] cursor-pointer ${!loadStatus ? "bg-gray-200 text-gray-500" : selectedDate == date ? "bg-white border-gray-200" : "border-transparent text-gray-600"} font-bold`}>
                <p>{`${dateSplit[0]}년 ${dateSplit[1]}월 ${dateSplit[2]}일`}</p>
                <div className={"w-4 aspect-square flex items-center justify-center"}>
                {
                  isUploading || !loadStatus
                    ? <div className={"w-4 aspect-square"}><CircularLoader/></div>
                    : <div className={`w-2 aspect-square rounded-full ${snippet.length == 1 ? "bg-green-500" : "bg-gray-400"}`}></div>
                }
                </div>

              </button>
            })
          }
        </div>
        <div className={"flex space-x-2.5 flex-1 justify-end"}>
          <IconTextButton src={"/arrow-path.svg"} text={"초기화"} onClick={() => {
            const confirm = window.confirm("작성하시던 내용을 초기화하시겠습니까?");
            if (confirm) {
              setSnippetContent(template);
            }
          }} />
          {/*<IconTextButton src={"/arrow-up-right.svg"} text={"Snippet 조회하기"} onClick={() => location.href="/snippets"} />*/}
          <IconTextButton src={"/globe.svg"} text={"임시저장"} onClick={() => {
            const confirm = window.confirm("지금 상태로 헬스체크를 임시저장할까요?");
            if (confirm) {
              window.localStorage.setItem(`healthcheck__tempsave__${selectedDate!}`, snippetContent);
            }
          }} />
          <IconTextButton src={"/globe.svg"} text={"임시저장 불러오기"} onClick={() => {
            const result = window.localStorage.getItem(`healthcheck__tempsave__${selectedDate!}`);
            if (result) {
              const confirm = window.confirm("임시저장한 헬스체크를 불러올까요?");
              if (confirm) {
                setSnippetContent(result!);
              }
            } else {
              window.alert("임시저장한 헬스체크가 없어요.");
            }
          }} />
          <button className={`rounded-lg font-semibold flex w-fit px-5 items-center justify-center ${isUploading ? "text-gray-300 bg-gray-500" : "text-white bg-gray-800"}`} onClick={async () => {
            if (!isUploading && session?.user?.email != "") {
              const email = session?.user?.email as string;
              setIsUploading(true);
              const myDriveList = (await driveGetFile(healthcheckDriveId)).filter((f: { id: string, name: string } ) => f.name == `${selectedDate!}_${email}`);
              if (myDriveList.length == 0) {
                setSubmitText("Google Drive에 파일이 업로드되어 있지 않아서 업로드하고 있어요")
              } else {
                setSubmitText("Google Drive에서 파일 정리 중")
                for await (const file of myDriveList) {
                  await driveDeleteFile(file.id);
                }
              }
              setSubmitText("Google Drive에 파일 업로드 중")
              await driveUploadFile(healthcheckDriveId, `${selectedDate!}_${email}`, snippetContent);
              setSubmitText("업로드 완료");
              window.localStorage.removeItem(`healthcheck__tempsave__${selectedDate!}`);
              setTimeout(() => {
                setIsUploading(false);
                router.push("/");
              }, 2000);
            }
          }}>{ isUploading ? <div className={"flex space-x-2.5"}>
            <div className={"w-5 aspect-square"}><CircularLoader/></div>
            <p>{submitText}</p>
          </div> : "Google Drive에 업로드"}</button>
        </div>
      </div>
      <div className={"flex-1 relative"}>
        <div className={"absolute w-full h-full flex items-end justify-center bg-gray-800/40 rounded-md"}>
          <div className={"bg-black rounded-md p-5 mb-10 text-white"}>입력할 수 없어요</div>
        </div>
        <HealthcheckEditor content={snippetContent} onSnippetChange={onSnippetChange} />
      </div>
    </div>
  </div>
}

type healthcheckEditorType = {
  content: string,
  onSnippetChange: (value: string) => void;
}

const HealthcheckEditor = ({ content, onSnippetChange }: healthcheckEditorType) => {
  return <div className={`w-full h-full border-[1px] border-gray-300 rounded-2xl`}>
    <Editor content={content} contentChange={onSnippetChange} disabled={false} />
  </div>
}

export default DailyHealthcheckEdit;