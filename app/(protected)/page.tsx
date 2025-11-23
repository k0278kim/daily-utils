"use client";

import {redirect, useRouter} from "next/navigation";

export default function Page() {
  const router = useRouter();

  redirect("/snippets")

  if (typeof window === "undefined") return <div></div>
  return <div className={"w-full h-full"}>
    <div className={"flex flex-col space-y-5"}>
      <button className={""} onClick={() => router.replace("/snippets")}>기록 조회</button>
      <button className={""} onClick={() => router.replace("/daily_edit")}>오늘 기록</button>
    </div>
  </div>
}