"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { createClient } from "@/utils/supabase/supabaseClient";

export interface AppError {
  status?: number;
  message?: string;
}

export default function CompleteSignupPage() {
  const router = useRouter();
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [nickname, setNickname] = useState("");
  const [avatarUrl, setAvatarUrl] = useState("");

  // 사용자가 입력하는 것은 '팀 이름'이므로 변수명 명확화
  const [teamName, setTeamName] = useState("");

  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  const supabase = createClient();

  useEffect(() => {
    const initUser = async () => {
      const { data: { user } } = await supabase.auth.getUser();

      if (!user) {
        router.replace("/onboarding"); // push 대신 replace 권장 (뒤로가기 방지)
        return;
      }

      setName(user.user_metadata?.full_name || "");
      setEmail(user.email || "");
      setAvatarUrl(user.user_metadata?.avatar_url || "");
    };
    initUser();
  }, [supabase, router]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError("");

    try {
      if (!name || !nickname || !teamName) {
        throw new Error("모든 항목을 입력해주세요.");
      }

      // 1. 현재 로그인 세션 확인
      const { data: { user }, error: getUserError } = await supabase.auth.getUser();
      if (getUserError || !user) throw new Error("로그인이 만료되었습니다. 다시 로그인해주세요.");

      // 2. [추가된 로직] 입력한 '팀 이름'으로 진짜 '팀 ID(UUID)' 찾기
      // (DB의 profiles.team_id가 UUID라면 이 과정이 필수입니다)
      const { data: teamData, error: teamError } = await supabase
        .from("team") // 테이블 이름 확인 (teams 인지 team 인지)
        .select("id")
        .eq("name", teamName) // 사용자가 입력한 이름과 일치하는 팀 찾기
        .maybeSingle();

      if (teamError) {
        throw new Error("팀 정보를 조회하는 중 오류가 발생했습니다.");
      }

      if (!teamData) {
        throw new Error("존재하지 않는 팀 이름입니다. 정확히 입력해주세요.");
      }

      // 3. 프로필 업데이트 (Upsert)
      const { error: upsertError } = await supabase.from("profiles").upsert({
        id: user.id,
        email: email,
        name: name,
        nickname: nickname,
        team_id: teamData.id, // 👈 찾아낸 UUID를 넣어야 합니다.
        avatar_url: avatarUrl,
        is_active: true,
        // updated_at: new Date().toISOString() // 필요하다면 추가
      });

      if (upsertError) {
        // FK 에러 등 상세 에러 처리
        if (upsertError.code === "23503") { // Foreign Key Violation
          throw new Error("팀 ID 연결에 실패했습니다.");
        }
        throw upsertError;
      }

      console.log("프로필 설정 완료");

      // 4. 성공 시에만 페이지 이동! (finally에서 빼냄)
      router.replace("/");

    } catch (err: unknown) {
      const error = err as AppError;
      console.error("❌ Signup error:", error);
      // 사용자에게 보여줄 에러 메시지 설정
      setError(error.message || "가입 중 오류가 발생했습니다.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="flex flex-col justify-center items-center min-h-screen bg-white px-6">
      <div className="w-full max-w-sm">
        <h1 className="text-2xl font-bold text-gray-900 text-center mb-3">
          추가 정보 입력
        </h1>
        <p className="text-gray-500 text-sm text-center mb-8">
          서비스 이용을 위해 프로필을 완성해주세요.
        </p>

        <form onSubmit={handleSubmit} className="space-y-5">
          {/* 이메일 (읽기 전용) */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              이메일
            </label>
            <input
              type="email"
              value={email}
              disabled
              className="w-full px-4 py-3 border border-gray-300 rounded-lg bg-gray-100 text-gray-500"
            />
          </div>

          {/* 이름 */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              이름
            </label>
            <input
              type="text"
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="이름을 입력해주세요"
              className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-black outline-none transition"
            />
          </div>

          {/* 닉네임 */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              닉네임
            </label>
            <input
              type="text"
              value={nickname}
              onChange={(e) => setNickname(e.target.value)}
              placeholder="예: 베블리"
              className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-black outline-none transition"
            />
          </div>

          {/* 팀 이름 입력 */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              팀 이름
            </label>
            <input
              type="text"
              value={teamName}
              onChange={(e) => setTeamName(e.target.value)}
              placeholder="예: 7기-3팀 (정확히 입력)"
              className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-black outline-none transition"
            />
            <p className="text-xs text-gray-400 mt-1 ml-1">
              * 등록된 팀 이름을 정확하게 입력해야 합니다.
            </p>
          </div>

          {/* 에러 메시지 표시 */}
          {error && (
            <div className="p-3 bg-red-50 text-red-500 text-sm rounded-lg text-center">
              {error}
            </div>
          )}

          <button
            type="submit"
            disabled={loading}
            className={`w-full py-3 rounded-lg text-white font-semibold transition-all ${
              loading
                ? "bg-gray-400 cursor-not-allowed"
                : "bg-black hover:bg-gray-800"
            }`}
          >
            {loading ? "저장 중..." : "가입 완료"}
          </button>
        </form>

        <p className="text-sm text-center text-gray-400 mt-8">
          Google 계정으로 로그인 중입니다.
        </p>
      </div>
    </div>
  );
}