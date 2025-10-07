"use client"
import React, {useEffect, useRef, useState} from "react";
import Editor from "@/components/MdEditor";
import formatDate from "@/lib/utils/format_date";
import {Snippet} from "@/model/snippet";
import CircularLoader from "@/components/CircularLoader";
import IconTextButton from "@/components/IconTextButton";
import {driveUploadFile} from "@/app/api/drive_upload_file";
import {signIn, useSession} from "next-auth/react";
import {driveGetFolder} from "@/app/api/drive_get_folder";
import {driveDeleteFile} from "@/app/api/drive_delete_file";
import LoadOrLogin from "@/components/LoadOrLogin";
import {useRouter} from "next/navigation";
import {healthcheckDriveId} from "@/app/data/drive_id";
import {DriveFolder} from "@/model/driveFolder";
import {driveGetFile} from "@/app/api/drive_get_file";
import _ from "lodash";

const DailyHealthcheckEdit = () => {
  const template = `### Fun(재밌었는가?)
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
  const [checkContent, setCheckContent] = useState(template);
  const [selectedDate, setSelectedDate] = useState(formatDate(new Date()));
  const [healthchecks, setHealthchecks] = useState<DriveFolder[] | []>([]);
  const [isUploading, setIsUploading] = useState(false);
  const [loadStatus, setLoadStatus] = useState(false);
  const [loadOverflow, setLoadOverflow] = useState(false);
  const [disabled, setDisabled] = useState<boolean>(false);
  const dateRef = useRef<string | null>(null);

  const router = useRouter();

  const onContentChange = (str: string) => {
    setCheckContent(str);
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
    setDisabled(true);
    (async() => {
      if (session) {
        await driveGetFolder(healthcheckDriveId).then(async (res: DriveFolder[]) => {
          const filtered = res.filter((r) => r.name.split("_")[1] == session?.user?.email);
          setHealthchecks(filtered);
          const fold: DriveFolder[] = res.filter((df: DriveFolder) => df.name == `${selectedDate}_${session?.user?.email}`);
          if (fold.length == 1) {
            setCheckContent(await driveGetFile(session?.accessToken, fold[0].id));
          }
          setLoadStatus(true);
        });
      }
      if (!isUploading) {
        setDisabled(false);
      }
    })();

  }, [session]);

  useEffect(() => {
    setTimeout(() => {
      setLoadOverflow(true);
    }, 3000);
  }, [])

  if (!session) return <LoadOrLogin loadOverflow={loadOverflow} setLoadOverflow={setLoadOverflow} />

  return <div className={"w-full h-full bg-gray-100"}>
    <div className={"flex flex-col p-10 h-full space-y-10"}>
      <div className={"flex h-12"}>
        <div className={"flex space-x-2.5"}>
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
                      setCheckContent(fold[0].name.split("_")[0] == dateRef.current ? getFile : template);

                    } else {
                      setCheckContent(template);
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
                    : <div className={`w-2 aspect-square rounded-full ${healthchecks.filter((df: DriveFolder) => `${df.name.split("_")[0]}_${df.name.split("_")[1]}` == `${date}_${session?.user?.email}`).length == 1 ? "bg-green-500" : "bg-gray-400"}`}></div>
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
              setCheckContent(template);
            }
          }} />
          <IconTextButton src={"/globe.svg"} text={"임시저장"} onClick={() => {
            const confirm = window.confirm("지금 상태로 헬스체크를 임시저장할까요?");
            if (confirm) {
              window.localStorage.setItem(`healthcheck__tempsave__${selectedDate!}`, checkContent);
            }
          }} />
          <IconTextButton src={"/globe.svg"} text={"임시저장 불러오기"} onClick={() => {
            const result = window.localStorage.getItem(`healthcheck__tempsave__${selectedDate!}`);
            if (result) {
              const confirm = window.confirm("임시저장한 헬스체크를 불러올까요?");
              if (confirm) {
                setCheckContent(result!);
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
              await driveUploadFile(healthcheckDriveId, `${selectedDate!}_${email}`, checkContent);
              setSubmitText("업로드 완료");
              window.localStorage.removeItem(`healthcheck__tempsave__${selectedDate!}`);
              setDisabled(false);
              setTimeout(() => {
                setIsUploading(false);
                setSubmitText("업로드 시작");
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
        <HealthcheckEditor content={checkContent} onSnippetChange={onContentChange} disabled={disabled} />
      </div>
    </div>
  </div>
}

type healthcheckEditorType = {
  content: string,
  onSnippetChange: (value: string) => void;
  disabled: boolean;
}

const HealthcheckEditor = ({ content, onSnippetChange, disabled }: healthcheckEditorType) => {
  return <div className={`w-full h-full border-[1px] border-gray-300 rounded-2xl ${disabled ? "opacity-30" : ""}`}>
    <Editor content={content} contentChange={onSnippetChange} disabled={disabled} />
  </div>
}

export default DailyHealthcheckEdit;