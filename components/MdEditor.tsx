import MDEditor from "@uiw/react-md-editor";
import React from "react";

type editorProps = {
  content: string;
  contentChange: (value: string) => void;
  disabled: boolean;
  tempContent: string;
}

const Editor = ({ content, contentChange, disabled, tempContent }: editorProps) => {
  const handleTabKey = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
    if (e.key === "Enter" && content == "" && !disabled && tempContent != "") {
      e.preventDefault();
      const target = e.target as HTMLTextAreaElement;
      const start = target.selectionStart;
      const end = target.selectionEnd;
      const tab = "  "; // or "\t"

      contentChange(tempContent);

      // 커서 이동 (React는 즉시 반영 안되므로 setTimeout으로 보정)
      setTimeout(() => {
        target.selectionStart = target.selectionEnd = start + tab.length;
      }, 0);
    }
  };
  return (
    <div data-color-mode="light" className={"w-full h-full relative"}>
      { content == "" && <div className={"w-[48%] h-full absolute top-10 left-4 text-gray-400 select-none pointer-events-none z-10 text-sm"}>
        [[Enter를 치면 어제 스니펫이 기입됩니다.]]
        {tempContent.split("\n").map((s, i) => <p key={i}>{s}</p>)}</div> }
      <MDEditor
        height={"100%"}
        autoFocus={false}
        value={content}
        onChange={(value) => contentChange(value!)}
        defaultValue="**Light Mode Only**"
        className={"max-w-none text-black"}
        textareaProps={{
          disabled: disabled,
          onKeyDown: handleTabKey
        }}
      />
    </div>
  )
}

export default Editor;