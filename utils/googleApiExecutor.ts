// utils/googleApiExecutor.ts

/**
 * Google API를 안전하게 실행하는 래퍼 함수
 * 401 에러 발생 시 자동으로 토큰을 갱신하고 재시도합니다.
 * * @param accessToken 현재 가지고 있는 액세스 토큰
 * @param operation 실행할 API 함수 (토큰을 인자로 받아 Promise를 반환)
 * @param onTokenRefreshed (선택) 토큰이 갱신되었을 때 부모에게 알릴 콜백
 */
export async function executeGoogleApi<T>(
  accessToken: string | undefined,
  operation: (token: string) => Promise<T>,
  onTokenRefreshed?: (newToken: string) => void
): Promise<T> {
  if (!accessToken) {
    throw new Error("No access token provided");
  }

  try {
    // 1차 시도: 현재 토큰으로 실행
    return await operation(accessToken);
  } catch (error: any) {
    // 401 에러(Unauthorized)인 경우에만 갱신 로직 동작
    if (error.status === 401) {
      console.log("🔄 Google 토큰 만료됨. 갱신을 시도합니다...");

      try {
        // 토큰 갱신 API 호출
        const refreshRes = await fetch('/api/refresh-google-token', {
          method: 'POST',
        });

        if (!refreshRes.ok) {
          throw new Error("Failed to refresh Google token");
        }

        const { accessToken: newAccessToken } = await refreshRes.json();
        console.log("✅ 토큰 갱신 성공!");

        // (중요) 갱신된 토큰을 부모 컴포넌트나 상태 관리에 알림
        if (onTokenRefreshed) {
          onTokenRefreshed(newAccessToken);
        }

        // 2차 시도: 새 토큰으로 원래 하려던 작업 재실행
        return await operation(newAccessToken);

      } catch (refreshError) {
        console.error("❌ 토큰 갱신 실패:", refreshError);
        throw refreshError; // 갱신마저 실패하면 에러 던짐
      }
    }

    // 401 이외의 에러는 그냥 던짐
    throw error;
  }
}