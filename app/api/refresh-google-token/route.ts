import { createRouteHandlerClient } from '@supabase/auth-helpers-nextjs' // 또는 @supabase/ssr
import { cookies } from 'next/headers'
import { NextResponse } from 'next/server'

export async function POST(request) {
  // 1. 현재 로그인한 유저 확인 (보안)
  const supabase = createRouteHandlerClient({ cookies })
  const { data: { session } } = await supabase.auth.getSession()

  if (!session) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  // 2. DB에서 저장된 Google Refresh Token 가져오기
  const { data: tokenData, error } = await supabase
    .from('user_tokens')
    .select('google_refresh_token')
    .eq('user_id', session.user.id)
    .single()

  if (error || !tokenData?.google_refresh_token) {
    return NextResponse.json({ error: '리프레시 토큰이 DB에 없습니다. 재로그인 해주세요.' }, { status: 404 })
  }

  // 3. Google에 새 Access Token 요청
  const params = new URLSearchParams()
  params.append('client_id', process.env.GOOGLE_CLIENT_ID as string)
  params.append('client_secret', process.env.GOOGLE_CLIENT_SECRET as string)
  params.append('refresh_token', tokenData.google_refresh_token) // DB에서 꺼낸 값 사용
  params.append('grant_type', 'refresh_token')

  try {
    const response = await fetch('https://oauth2.googleapis.com/token', {
      method: 'POST',
      headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
      body: params,
    })

    const data = await response.json()

    if (!response.ok) {
      // 만약 리프레시 토큰이 만료되었다면 DB에서 삭제하는 로직 추가 가능
      throw new Error(data.error_description || 'Failed to refresh token')
    }

    return NextResponse.json({
      accessToken: data.access_token,
      expiresIn: data.expires_in
    })

  } catch (error) {
    return NextResponse.json({ error: error.message }, { status: 500 })
  }
}