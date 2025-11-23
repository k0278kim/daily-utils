// utils/googleAuth.ts
import { google } from "googleapis";
import { createClient } from "@/utils/supabase/server";

export async function getAuthenticatedGoogleClient() {
  const supabase = await createClient();

  // 🚨 [수정됨] getSession() -> getUser()
  // getSession은 쿠키 조작 가능성이 있으므로, 서버 API에서는 getUser가 필수입니다.
  const { data: { user }, error: userError } = await supabase.auth.getUser();

  if (userError || !user) {
    throw { status: 401, message: "로그인이 필요하거나 유효하지 않은 세션입니다." };
  }

  // 이제 안전하게 검증된 user.id를 사용해 DB에서 토큰을 조회합니다.
  const { data: tokenData, error } = await supabase
    .from('user_tokens')
    .select('google_refresh_token')
    .eq('user_id', user.id) // session.user.id 대신 user.id 사용
    .single();

  if (error || !tokenData?.google_refresh_token) {
    console.error("Token DB Error:", error);
    throw { status: 401, message: "Google 연동 정보가 없습니다. 다시 로그인해주세요." };
  }

  const oauth2Client = new google.auth.OAuth2(
    process.env.GOOGLE_CLIENT_ID,
    process.env.GOOGLE_CLIENT_SECRET
  );

  oauth2Client.setCredentials({
    refresh_token: tokenData.google_refresh_token
  });

  return oauth2Client;
}