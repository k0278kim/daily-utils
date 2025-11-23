// app/(protected)/layout.tsx

import { createClient } from "@/utils/supabase/server";
import { redirect } from "next/navigation";
import {Profile} from "@/model/Profile";

export default async function SignUpLayout({ children }: { children: React.ReactNode }) {

  const supabase = await createClient();

  // 1. 인증 상태 확인
  const { data: { user }, error: authError } = await supabase.auth.getUser();

  if (authError || !user) {
    redirect("/login");
  }

  // 2. (추가) 프로필 정보 확인
  const { data: profile, error: profileError } = await supabase
    .from('profiles')
    .select('id')
    .eq('id', user.id)
    .single<{ id: Pick<Profile, 'id'>, status: string }>(); // 타입 지정

  if (profile) {
    redirect("/");
  }

  // 4. 인증O, 프로필O 사용자만 통과
  return <>{children}</>;
}