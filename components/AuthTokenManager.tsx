'use client';

import { useEffect } from 'react';
import { createClientComponentClient } from '@supabase/auth-helpers-nextjs';

export default function AuthTokenManager() {
  const supabase = createClientComponentClient();

  useEffect(() => {
    const { data: { subscription } } = supabase.auth.onAuthStateChange(async (event, session) => {
      if (event === 'SIGNED_IN' && session) {
        const refreshToken = session.provider_refresh_token;

        if (refreshToken) {
          console.log('📡 [AuthTokenManager] API를 통해 토큰 저장을 요청합니다...');

          // API 호출 (직접 DB 접근 X)
          try {
            const response = await fetch('/api/save-token', {
              method: 'POST',
              headers: { 'Content-Type': 'application/json' },
              body: JSON.stringify({
                userId: session.user.id,
                refreshToken: refreshToken,
              }),
            });

            if (response.ok) {
              console.log('✅ [AuthTokenManager] 서버에 토큰 저장 완료!');
            } else {
              console.error('❌ [AuthTokenManager] 저장 실패:', await response.text());
            }
          } catch (err) {
            console.error('통신 에러:', err);
          }
        }
      }
    });

    return () => {
      subscription.unsubscribe();
    };
  }, [supabase]);

  return null;
}