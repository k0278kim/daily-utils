"use client";
import { useSession, signIn, signOut } from "next-auth/react";
import {useEffect} from "react";

export default function Page() {
  const { data: session, status } = useSession();

  useEffect(() => {
    if (session) {
      fetch("/api/drive/1ez6X_PnNC2Jaa-VcN6wEo_OikZQ-WbXC")
        .then((res) => res.json())
        .then((data) => {
          console.log(data)
        });
    }
  }, [session]);

  if (status === "loading") return <p>Loading...</p>;
  if (!session)
    return <button onClick={() => signIn("google")}>Google 로그인</button>;

  return (
    <div>
      <p>{session.user?.email}님 환영합니다</p>
      <button onClick={() => signOut()}>로그아웃</button>
      <div>
        <h2>내 Google Drive 파일</h2>
      </div>
    </div>
  );
}