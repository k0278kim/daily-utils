import { createServerClient } from "@supabase/ssr";
import { cookies } from "next/headers";

// 이 함수 하나만 불러다 쓰면 됩니다.
export async function createClient() {
  const cookieStore = await cookies(); // Next.js 15 대응 완료

  return createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        getAll() {
          return cookieStore.getAll();
        },
        setAll(cookiesToSet) {
          try {
            cookiesToSet.forEach(({ name, value, options }) =>
              cookieStore.set(name, value, options)
            );
          } catch {
            // 서버 컴포넌트에서 쿠키 설정 시 발생하는 에러 무시
          }
        },
      },
    }
  );
}