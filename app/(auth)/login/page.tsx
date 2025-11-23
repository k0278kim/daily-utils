'use client'

import Image from "next/image";
import {motion} from "framer-motion";
import {signIn} from "next-auth/react";
import {useSupabaseClient} from "@/context/SupabaseProvider";

const LoginPage = () => {

  const supabase = useSupabaseClient();

  const handleGoogleLogin = async () => {
    const redirectURL = `${location.origin}/auth/callback`;
    console.log("Redirecting to:", redirectURL); // 이 로그 확인!
    await supabase.auth.signInWithOAuth({
      provider: 'google',
      options: {
        // 이 URL은 Google 로그인 후 사용자가 돌아올 앱의 경로입니다.
        // /auth/callback 라우트를 다음 단계에서 만듭니다.
        scopes: 'https://www.googleapis.com/auth/drive',
        redirectTo: redirectURL,
        queryParams: {
          access_type: 'offline',
          prompt: 'consent'
        }
      },
    })
  }

  return <div className={"flex flex-col space-y-10 items-center justify-center w-full h-screen"}>
    <p className={"text-2xl font-bold"}>도다리도 뚜뚜려보고 건너는 양털 팀의</p>
    <p className={"text-7xl font-black"}>Daily Utils</p>
    <motion.div className={"cursor-pointer text-center p-5 bg-black rounded-xl text-white font-semibold text-xl"} onClick={handleGoogleLogin}>Google 로그인</motion.div>
  </div>
}

export default LoginPage;