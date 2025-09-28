import MDEditor from "@uiw/react-md-editor";
import React from "react";

type editorProps = {
  content: string;
  contentChange: (value: string) => void;
  disabled: boolean;
}

const Editor = ({ content, contentChange, disabled }: editorProps) => {
  return (
    <div data-color-mode="light" className={"w-full h-full"}>
      <MDEditor
        height={"100%"}
        autoFocus={false}
        value={content}
        onChange={(value) => contentChange(value!)}
        defaultValue="**Light Mode Only**"
        className={"max-w-none text-black"}
        textareaProps={{
          disabled: disabled
        }}
      />
    </div>
  )
}

export default Editor;