// context/SupabaseProvider.tsx

'use client'

import { createContext, useContext, useState, useEffect } from 'react'
import { createClient } from '@/utils/supabase/supabaseClient' // client.ts 파일
import type { SupabaseClient, User } from '@supabase/supabase-js'

// Context가 제공할 값의 타입을 정의합니다.
type SupabaseContextType = {
  supabase: SupabaseClient
  user: User | null
  isLoading: boolean
}

// Context 생성
const SupabaseContext = createContext<SupabaseContextType | null>(null)

export default function SupabaseProvider({ children }: { children: React.ReactNode }) {
  const [supabase] = useState(() => createClient())
  const [user, setUser] = useState<User | null>(null)

  // 1. 여기서 이미 'true'로 초기화되었습니다.
  const [isLoading, setIsLoading] = useState(true)

  useEffect(() => {
    // 2. 이 라인을 삭제합니다. (ESLint 오류 발생 지점)
    // setIsLoading(true)  // <-- 이 줄을 삭제하세요.

    // 3. onAuthStateChange가 콜백을 실행하면
    const { data: { subscription } } = supabase.auth.onAuthStateChange(
      (event, session) => {
        setUser(session?.user ?? null)

        // 4. 여기서 'false'로 변경됩니다. (이것은 올바른 패턴입니다)
        setIsLoading(false)
      }
    )

    return () => {
      subscription.unsubscribe()
    }
  }, [supabase])

  const value = {
    supabase,
    user,
    isLoading,
  }

  return (
    <SupabaseContext.Provider value={value}>
      {children}
    </SupabaseContext.Provider>
  )
}

// --- Custom Hooks ---

// 1. 전체 인증 Context를 반환하는 훅 (모든 값이 필요할 때)
export const useAuth = () => {
  const context = useContext(SupabaseContext)
  if (context === null) {
    throw new Error('useAuth must be used within a SupabaseProvider')
  }
  return context
}

// 2. (사용자 요청) User와 Loading 상태만 반환하는 훅
export const useUser = () => {
  const context = useContext(SupabaseContext)
  if (context === null) {
    throw new Error('useUser must be used within a SupabaseProvider')
  }
  // user와 isLoading만 선택적으로 반환
  return { user: context.user, isLoading: context.isLoading }
}

// 3. Supabase 클라이언트만 반환하는 훅 (이전의 useSupabase 대체)
export const useSupabaseClient = () => {
  const context = useContext(SupabaseContext)
  if (context === null) {
    throw new Error('useSupabaseClient must be used within a SupabaseProvider')
  }
  return context.supabase
}