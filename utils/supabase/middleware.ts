// utils/supabase/middleware.ts

import { createServerClient } from '@supabase/ssr'
import { NextResponse } from 'next/server'

// 타입을 분리해서 import 합니다.
import type { NextRequest } from 'next/server'
import type { CookieOptions } from '@supabase/ssr'

export async function updateSession(request: NextRequest) {
  let response = NextResponse.next({
    request: {
      headers: request.headers,
    },
  })

  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        get(name: string) {
          return request.cookies.get(name)?.value
        },
        set(name: string, value: string, options: CookieOptions) {
          request.cookies.set({ name, value, ...options })
          response = NextResponse.next({
            request: {
              headers: request.headers,
            },
          })
          response.cookies.set({ name, value, ...options })
        },
        remove(name: string, options: CookieOptions) {
          // 1. request.cookies.set 수정
          request.cookies.set({ name, value: '', ...options })
          response = NextResponse.next({
            request: {
              headers: request.headers,
            },
          })
          // 2. response.cookies.set 수정
          response.cookies.set({ name, value: '', ...options })
        },
      },
    }
  )

  // 사용자의 세션을 새로고침합니다.
  await supabase.auth.getSession()

  return response
}