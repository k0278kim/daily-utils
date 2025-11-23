import { createClient } from '@/utils/supabase/server'
import { NextResponse } from 'next/server'
import { type NextRequest } from 'next/server'

export async function GET(request: NextRequest) {
  const { searchParams, origin } = new URL(request.url)
  const code = searchParams.get('code')
  // 'next'는 로그인 후 리디렉션할 경로 (옵션)
  const next = searchParams.get('next') ?? '/'

  if (code) {
    const supabase = await createClient();
    const { error } = await supabase.auth.exchangeCodeForSession(code)
    if (!error) {

      const { data: userProfile, error: profileError } = await supabase
        .from("profiles")
        .select("id")
        .eq("id", (await supabase.auth.getUser()).data.user?.id)
        .maybeSingle();

      if (profileError) {
        console.log(profileError);
        throw new Error('프로필 조회 실패');
      }

      console.log(origin, next);

      if (!userProfile) {
        return NextResponse.redirect(`${origin}/complete-signup`);
      }
      return NextResponse.redirect(`${origin}${next}`)
    }
  }

  // 오류 발생 시 에러 페이지로 리디렉션
  return NextResponse.redirect(`${origin}/auth/auth-error`)
}