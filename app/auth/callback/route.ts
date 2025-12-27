import { createClient } from '@/utils/supabase/server'
import { NextResponse } from 'next/server'
import { type NextRequest } from 'next/server'

export async function GET(request: NextRequest) {
  const { searchParams, origin } = new URL(request.url)
  const code = searchParams.get('code')
  // 'next'는 로그인 후 리디렉션할 경로 (옵션)
  const next = searchParams.get('next') ?? '/'
  const isPopup = searchParams.get('popup') === 'true';

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
        // Popup mode error handling
        if (isPopup) {
          return new NextResponse(
            `<html><body><script>window.opener.postMessage({ type: 'login_error', message: '프로필 조회 실패' }, '*'); window.close();</script></body></html>`,
            { headers: { 'Content-Type': 'text/html' } }
          );
        }
        throw new Error('프로필 조회 실패');
      }

      console.log(origin, next);

      // Popup Success Handling
      if (isPopup) {
        const { data: { session } } = await supabase.auth.getSession();
        const targetUrl = !userProfile ? `${origin}/complete-signup` : `${origin}${next}`;

        // Serialize session safely
        const sessionStr = JSON.stringify(session);

        return new NextResponse(
          `<html><body><script>
            try {
                window.opener.postMessage({ 
                    type: 'supabase.auth.signin', 
                    event: 'SIGNED_IN', 
                    url: '${targetUrl}',
                    session: ${sessionStr}
                }, '*');
            } catch (e) {
                console.error(e);
            }
            window.close();
          </script></body></html>`,
          { headers: { 'Content-Type': 'text/html' } }
        );
      }

      if (!userProfile) {
        return NextResponse.redirect(`${origin}/complete-signup`);
      }
      return NextResponse.redirect(`${origin}${next}`)
    }
  }

  // 오류 발생 시 에러 페이지로 리디렉션
  if (isPopup) {
    return new NextResponse(
      `<html><body><script>window.opener.postMessage({ type: 'login_error', message: '인증 실패' }, '*'); window.close();</script></body></html>`,
      { headers: { 'Content-Type': 'text/html' } }
    );
  }
  return NextResponse.redirect(`${origin}/auth/auth-error`)
}