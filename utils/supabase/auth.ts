// utils/supabase/auth.ts
import { createClient } from "@/utils/supabase/server"; // 기존에 만든 createClient import

export async function requireAuth() {
  // 1. Supabase 클라이언트 생성
  const supabase = await createClient();

  // 2. 유저 정보 가져오기
  const { data: { user }, error } = await supabase.auth.getUser();

  // 3. 유저가 없거나 에러가 나면 401 에러 던짐
  if (error || !user) {
    throw { status: 401, message: "Unauthorized: 로그인이 필요합니다." };
  }

  // 4. 성공 시, DB 조회에 바로 쓸 수 있게 supabase 클라이언트와 user를 같이 반환
  return { supabase, user };
}