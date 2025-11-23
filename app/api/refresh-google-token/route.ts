import { NextRequest, NextResponse } from 'next/server'; // 1. NextRequest import
import { createClient } from '@/utils/supabase/server';
import {AppError} from "@/app/(auth)/(signup)/complete-signup/page"; // 2. 이전에 만든 유틸 사용

// 3. request 파라미터에 타입 지정 (: NextRequest)
export async function POST(request: NextRequest) {
  try {
    // 4. Supabase 클라이언트 생성 (Next.js 15 대응 유틸)
    const supabase = await createClient();

    // 5. 세션 대신 getUser로 확실한 검증
    const { data: { user } } = await supabase.auth.getUser();

    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    // 6. DB에서 리프레시 토큰 조회
    const { data: tokenData, error } = await supabase
      .from('user_tokens')
      .select('google_refresh_token')
      .eq('user_id', user.id)
      .single();

    if (error || !tokenData?.google_refresh_token) {
      return NextResponse.json({ error: '리프레시 토큰이 없습니다. 재로그인 해주세요.' }, { status: 404 });
    }

    // 7. Google OAuth 2.0 엔드포인트로 갱신 요청
    const params = new URLSearchParams();
    params.append('client_id', process.env.GOOGLE_CLIENT_ID!);
    params.append('client_secret', process.env.GOOGLE_CLIENT_SECRET!);
    params.append('refresh_token', tokenData.google_refresh_token);
    params.append('grant_type', 'refresh_token');

    const response = await fetch('https://oauth2.googleapis.com/token', {
      method: 'POST',
      headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
      body: params,
    });

    const data = await response.json();

    if (!response.ok) {
      throw new Error(data.error_description || 'Failed to refresh token');
    }

    // 성공 시 새 액세스 토큰 반환
    return NextResponse.json({
      accessToken: data.access_token,
      expiresIn: data.expires_in
    });

  } catch (error: unknown) {
    const err = error as AppError;
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}