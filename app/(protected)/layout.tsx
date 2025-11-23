// app/(protected)/layout.tsx

import { createClient } from "@/utils/supabase/server";
import { redirect } from "next/navigation";
import {Profile} from "@/model/Profile";

export default async function ProtectedLayout({ children }: { children: React.ReactNode }) {

  const supabase = await createClient();

  // 1. 인증 상태 확인
  const { data: { user }, error: authError } = await supabase.auth.getUser();

  if (authError || !user) {
    redirect("/login");
  }

  // 2. (추가) 프로필 정보 확인
  const { data: profile, error: profileError } = await supabase
    .from('profiles')
    .select('id') // 존재 여부만 확인하면 되므로 'id'만 가져옵니다.
    .eq('id', user.id)
    .single<{ id: Pick<Profile, 'id'>, status: string}>(); // 타입 지정

  console.log(profile);

  // 프로필이 없고, 에러가 'PGRST116'(데이터 없음)가 아닌 경우
  if (!profile && profileError && profileError.code !== 'PGRST116') {
    // 에러 페이지로 리디렉션하거나 로그인 페이지로 보낼 수 있습니다.
    redirect("/login");
  }
  console.log(profile);

  // 3. (중요) 프로필이 없는 사용자 리디렉션
  if (!profile) {
    redirect("/complete-signup");
  }

  // 4. 인증O, 프로필O 사용자만 통과
  return <div className={"w-full h-dvh"}>{children}</div>;
}