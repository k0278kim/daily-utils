import { createClient } from '@supabase/supabase-js';
import { NextRequest, NextResponse } from 'next/server';

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const { userId, refreshToken } = body;

    if (!userId || !refreshToken) {
      return NextResponse.json({ error: '데이터가 부족합니다.' }, { status: 400 });
    }

    // 1. 관리자 권한(Service Role)으로 Supabase 클라이언트 생성
    // (이 클라이언트는 모든 RLS를 무시합니다)
    const supabaseAdmin = createClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.SUPABASE_SERVICE_ROLE_KEY!,
      {
        auth: {
          autoRefreshToken: false,
          persistSession: false,
        },
      }
    );

    // 2. user_tokens 테이블에 강제 저장 (Upsert)
    const { error } = await supabaseAdmin
      .from('user_tokens')
      .upsert({
        user_id: userId,
        google_refresh_token: refreshToken,
        updated_at: new Date().toISOString(),
      });

    if (error) {
      console.error('Admin DB Write Error:', error);
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    return NextResponse.json({ success: true });

  } catch (error) {
    return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 });
  }
}