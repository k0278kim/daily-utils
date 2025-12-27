'use client'

import Image from "next/image";
import { motion } from "framer-motion";
import { signIn } from "next-auth/react";
import { useSupabaseClient } from "@/context/SupabaseProvider";

const LoginPage = () => {

  const supabase = useSupabaseClient();

  const handleGoogleLogin = async () => {
    const redirectURL = `${location.origin}/auth/callback?popup=true`;
    console.log("Redirecting to:", redirectURL);

    const { data, error } = await supabase.auth.signInWithOAuth({
      provider: 'google',
      options: {
        scopes: 'https://www.googleapis.com/auth/drive.file', // Scopes updated to drive.file as per previous conversation context, can revert if needed
        redirectTo: redirectURL,
        queryParams: {
          access_type: 'offline',
          prompt: 'consent'
        },
        skipBrowserRedirect: true,
      },
    });

    if (error) {
      console.error("Login error:", error);
      alert("로그인 시작 중 오류가 발생했습니다.");
      return;
    }

    if (data?.url) {
      // Open Popup with blank target first
      const width = 500;
      const height = 600;
      const left = window.screen.width / 2 - width / 2;
      const top = window.screen.height / 2 - height / 2;

      // Open blank popup synchronously-ish (browser might still block if async, but we will try)
      // Actually, for strict referrer hiding, we open a new window, write a document that clears referrer, and redirects.

      const popup = window.open(
        'about:blank',
        'google-login',
        `width=${width},height=${height},left=${left},top=${top},toolbar=0,menubar=0,location=0,status=1,scrollbars=1,resizable=1`
      );

      if (!popup) {
        alert('팝업이 차단되었습니다. 팝업 차단을 해제하고 다시 시도해주세요.');
        return;
      }

      // HIDE REFERRER: Write HTML that performs the redirect with no-referrer policy
      // This prevents Google from seeing 'notion.so' as the referrer and blocking the request (403)
      popup.document.write(`
            <html>
                <head>
                    <meta name="referrer" content="no-referrer" />
                </head>
                <body>
                    <script>
                        window.location.href = "${data.url}";
                    </script>
                </body>
            </html>
        `);

      // Listen for message from popup
      const messageHandler = async (event: MessageEvent) => {
        if (event.origin !== location.origin) return;

        if (event.data?.type === 'supabase.auth.signin') {
          console.log("Login Successful!", event.data);
          window.removeEventListener('message', messageHandler);

          // Manual Session Setting for Iframe context
          if (event.data.session) {
            const { error } = await supabase.auth.setSession(event.data.session);
            if (error) {
              console.error("Failed to set session:", error);
            }
          }

          // Redirect logic
          if (event.data.url) {
            window.location.href = event.data.url;
          } else {
            window.location.href = '/';
          }
        } else if (event.data?.type === 'login_error') {
          console.error("Popup Login Error:", event.data.message);
          alert(`로그인 실패: ${event.data.message}`);
          popup.close();
          window.removeEventListener('message', messageHandler);
        }
      };

      window.addEventListener('message', messageHandler);

      // Optional: Check if popup closed manually
      const checkPopup = setInterval(() => {
        if (popup.closed) {
          clearInterval(checkPopup);
          window.removeEventListener('message', messageHandler);
        }
      }, 1000);
    }
  }

  return <div className={"flex flex-col space-y-10 items-center justify-center w-full h-screen"}>
    <p className={"text-2xl font-bold"}>도다리도 뚜뚜려보고 건너는 양털 팀의</p>
    <p className={"text-7xl font-black"}>Daily Utils</p>
    <motion.div className={"cursor-pointer text-center p-5 bg-black rounded-xl text-white font-semibold text-xl"} onClick={handleGoogleLogin}>Google 로그인</motion.div>
  </div>
}

export default LoginPage;