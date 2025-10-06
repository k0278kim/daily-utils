"use client"
import React, {useEffect, useState} from "react";
import Editor from "@/components/MdEditor";
import formatDate from "@/lib/utils/format_date";
import fetchSnippet from "@/app/api/fetch_snippet";
import {Snippet} from "@/model/snippet";
import {addSnippet} from "@/app/api/snippet/add_snippet/add_snippet";
import CircularLoader from "@/components/CircularLoader";
import IconTextButton from "@/components/IconTextButton";
import {driveUploadFile} from "@/app/api/drive_upload_file";
import {signIn, useSession} from "next-auth/react";
import {driveGetFolder} from "@/app/api/drive_get_folder";
import {driveDeleteFile} from "@/app/api/drive_delete_file";
import LoadOrLogin from "@/components/LoadOrLogin";
import {useRouter} from "next/navigation";
import {snippetDriveId} from "@/app/data/drive_id";

type dailySnippetEditProps = {
  setSelectedArea: (area: number) => void;
};

export const DailySnippetEdit = ({ setSelectedArea }: dailySnippetEditProps ) => {
  const template = `### What
1. a
2. b
3. c
### Why
- a
- b
- c
### Highlight

### Lowlight

### Tomorrow
`;
  const { data: session } = useSession();
  const [submitText, setSubmitText] = useState<string>("발행하기");
  const [snippetContent, setSnippetContent] = useState(template);
  const [selectedDate, setSelectedDate] = useState(formatDate(new Date()));
  const [snippets, setSnippets] = useState([]);
  const [isUploading, setIsUploading] = useState(false);
  const [loadStatus, setLoadStatus] = useState(false);
  const [editorDisabled, setEditorDisabled] = useState(true);
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

  const getMySnippets = async (email: string) => {
    const availableDate = dailySnippetAvailableDate();
    const snippets = await fetchSnippet(availableDate[0]!, availableDate.length == 2 ? availableDate[1]! : availableDate[0]!);
    return snippets.filter((snippet: Snippet) => snippet.user_email == email).sort((a: Snippet, b: Snippet) => Number(new Date(a.snippet_date)) - Number(new Date(b.snippet_date)));
  }

  useEffect(() => {
    setLoadStatus(false);
    (async() => {
      if (session) {
        await getMySnippets(session?.user?.email as string).then((res) => {
          setSnippets(res);
          const snip: Snippet[] = res.filter((sn: Snippet) => sn.snippet_date == selectedDate);
          if (snip.length == 1) {
            setSnippetContent(snip[0].content);
          } else {
            setEditorDisabled(false);
          }
          setLoadStatus(true);
        });
      }
      if (!isUploading) {
        setEditorDisabled(false);
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
              const snippet: Snippet[] = snippets.filter((snip: Snippet) => snip.snippet_date == date);
              return <button
                key={date}
                onClick={() => {
                  if (loadStatus) {
                    setSelectedDate(date!);
                    if (snippet.length == 1) {
                      setSnippetContent(snippet[0].content);
                      setEditorDisabled(true);
                    } else {
                      setEditorDisabled(false);
                      setSnippetContent(template);
                    }
                  }
                }}
                className={`text-sm flex items-center space-x-2.5 rounded-lg p-3 border-[1px] cursor-pointer ${!loadStatus ? "bg-gray-200 text-gray-500" : selectedDate == date ? "bg-white border-gray-200" : "border-transparent text-gray-600"} font-bold`}>
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
          { !editorDisabled && <IconTextButton src={"/arrow-path.svg"} text={"초기화"} onClick={() => {
            const confirm = window.confirm("작성하시던 내용을 초기화하시겠습니까?");
            if (confirm) {
              setSnippetContent(template);
            }
          }} />}
          <IconTextButton src={"/arrow-up-right.svg"} text={"Snippet 조회하기"} onClick={() => location.href="/snippets"} />
          <IconTextButton src={"/arrow-up-right.svg"} text={"Daily Snippet"} onClick={() => { window.open("https://daily.1000.school")}} />
          <IconTextButton src={"/globe.svg"} text={"임시저장"} onClick={() => {
            const confirm = window.confirm("지금 상태로 스니펫을 임시저장할까요?");
            if (confirm) {
              window.localStorage.setItem(`snippet__tempsave__${selectedDate!}`, snippetContent);
            }
          }} />
          <IconTextButton src={"/globe.svg"} text={"임시저장 불러오기"} onClick={() => {
            const result = window.localStorage.getItem(`snippet__tempsave__${selectedDate!}`);
            if (result) {
              const confirm = window.confirm("임시저장한 스니펫을 불러올까요?");
              if (confirm) {
                setSnippetContent(result!);
              }
            } else {
              window.alert("임시저장한 스니펫이 없어요.");
            }
          }} />
          <button className={`text-sm rounded-lg font-semibold flex w-fit px-5 items-center justify-center ${isUploading ? "text-gray-300 bg-gray-500" : "text-white bg-gray-800"}`} onClick={async () => {
            if (!isUploading && session?.user?.email != "") {
              setEditorDisabled(true);
              const email = session?.user?.email as string;
              setIsUploading(true);
              setSubmitText("Daily Snippet 채널에 업로드가 가능한지 확인 중")
              const result = (await addSnippet(email, selectedDate!, snippetContent)).received;
              const myDriveList = (await driveGetFolder(snippetDriveId)).filter((f: { id: string, name: string } ) => f.name == `${selectedDate!}_${session?.user?.name}`);
              if (result.length == 1) {
                setSnippets(await getMySnippets(session?.user?.email as string));
                setSubmitText("Google Drive에서 파일 정리 중")
                for await (const file of myDriveList) {
                  await driveDeleteFile(file.id);
                }
                setSubmitText("Google Drive에 파일 업로드 중")
                await driveUploadFile(snippetDriveId, `${selectedDate!}_${session?.user?.name}`, snippetContent);
                setSubmitText("업로드 완료");
                window.localStorage.removeItem(`snippet__tempsave__${selectedDate!}`);
                setTimeout(() => {
                  setIsUploading(false);
                }, 1000);
                setSelectedArea(1);
              } else {
                setSubmitText("이미 업로드가 되어 있어요");
                setEditorDisabled(true);
                setTimeout(() => {
                  setIsUploading(false);
                }, 1000);
              }
              if (myDriveList.length == 0) {
                setSubmitText("Google Drive에 파일이 업로드되어 있지 않아서 업로드하고 있어요")
                await getMySnippets(session?.user?.email as string).then(async (res) => {
                  setSnippets(res);
                  const snip: Snippet[] = res.filter((sn: Snippet) => sn.snippet_date == selectedDate);
                  if (snip.length == 1) {
                    setSnippetContent(snip[0].content);
                    await driveUploadFile(snippetDriveId, `${selectedDate!}_${session?.user?.name}`, snip[0].content);
                  }
                });
                setSubmitText("업로드 완료");
                setEditorDisabled(true);
                setTimeout(() => {
                  setIsUploading(false);
                }, 1000);
              }
            }
          }}>{ isUploading ? <div className={"flex space-x-2.5"}>
            <div className={"w-5 aspect-square"}><CircularLoader/></div>
            <p>{submitText}</p>
          </div> : editorDisabled ? "Google Drive 업로드 확인하기" : "발행하기" }</button>
        </div>
      </div>
      <div className={"flex-1 relative"}>
        <div className={"absolute w-full h-full flex items-end justify-center bg-gray-800/40 rounded-md"}>
          <div className={"bg-black rounded-md p-5 mb-10 text-white"}>입력할 수 없어요</div>
        </div>
        <SnippetEditor content={snippetContent} onSnippetChange={onSnippetChange} editorDisabled={editorDisabled} />
      </div>
    </div>
  </div>
}

type snippetEditorType = {
  content: string,
  onSnippetChange: (value: string) => void;
  editorDisabled: boolean;
}

const SnippetEditor = ({ content, onSnippetChange, editorDisabled }: snippetEditorType) => {
  return <div className={`w-full h-full border-[1px] border-gray-300 rounded-2xl ${editorDisabled ? "opacity-30" : ""}`}>
    <Editor content={content} contentChange={onSnippetChange} disabled={editorDisabled} />
  </div>
}