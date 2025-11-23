export async function executeGoogleApi<T>(
  accessToken: string | undefined, // undefined가 들어올 수 있음
  operation: (token: string) => Promise<T>,
  onTokenRefreshed?: (newToken: string) => void
): Promise<T> {

  // 1. 토큰이 있는 경우: 먼저 시도해봄
  if (accessToken) {
    try {
      return await operation(accessToken);
    } catch (error: any) {
      // 401(만료)이 아니면 진짜 에러이므로 던짐
      if (error.status !== 401) {
        throw error;
      }
      // 401이면 아래 갱신 로직으로 넘어감 (여기서 catch 잡고 흘려보냄)
      console.log("🔄 토큰 만료됨 (401). 갱신 시도...");
    }
  } else {
    // 토큰이 아예 없으면 로그만 찍고 바로 갱신 시도
    console.log("⚠️ 토큰이 없음. 갱신 시도...");
  }

  // 2. 토큰 갱신 및 재시도 (토큰이 없었거나, 401이 떴을 때 여기로 옴)
  try {
    const refreshRes = await fetch('/api/refresh-google-token', {
      method: 'POST',
    });

    if (!refreshRes.ok) {
      throw new Error("Failed to refresh Google token");
    }

    const { accessToken: newAccessToken } = await refreshRes.json();
    console.log("✅ 토큰 갱신/발급 성공!");

    // 부모에게 알림
    if (onTokenRefreshed) {
      onTokenRefreshed(newAccessToken);
    }

    // 새 토큰으로 작업 수행
    return await operation(newAccessToken);

  } catch (refreshError) {
    console.error("❌ 토큰 갱신 실패:", refreshError);
    // 갱신마저 실패하면 로그인 페이지로 보내거나 에러 처리
    throw refreshError;
  }
}