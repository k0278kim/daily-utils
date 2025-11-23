"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { createClient } from "@/utils/supabase/supabaseClient";

export default function CompleteSignupPage() {
  const router = useRouter();
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [nickname, setNickname] = useState("");
  const [avatarUrl, setAvatarUrl] = useState("");
  const [teamId, setTeamId] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  const supabase = createClient();

  useEffect(() => {
    const initUser = async () => {
      const { data: { user } } = await supabase.auth.getUser();

      if (!user) {
        router.push("/onboarding");
        return;
      }

      setName(user.user_metadata?.full_name);
      setEmail(user.email!);
      setAvatarUrl(user.user_metadata?.avatar_url);
    }
    initUser();
  }, [supabase, router]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault(); // ✅ form 기본 리로드 방지
    setLoading(true);
    setError("");

    try {
      if (!name || !nickname || !teamId)
        throw new Error("모든 항목을 입력해주세요.");

      // ✅ 현재 로그인 사용자 가져오기
      const { data, error: getUserError } = await supabase.auth.getUser();
      if (getUserError) throw getUserError;
      const user = data?.user;
      if (!user) throw new Error("로그인이 만료되었습니다. 다시 로그인해주세요.");

      // ✅ 프로필 업서트
      const { error: upsertError } = await supabase.from("profiles").upsert({
        id: user.id, // ⚡ 꼭 넣어야 PK 충돌 없음
        email: email,
        name,
        nickname,
        team_id: teamId,
        avatar_url: avatarUrl,
        is_active: true
      });

      if (upsertError?.code == "22P02") {
        alert("올바르지 않은 팀 ID입니다.");
      }

      console.log(user.id, email, name, nickname, teamId, avatarUrl, upsertError);

    } catch (err: any) {
      console.error("❌ Signup error:", err);
      setError(err.message ?? "가입 중 오류가 발생했습니다.");
    } finally {
      setLoading(false);
      router.replace("/");
    }
  };

  return (
    <div className="flex flex-col justify-center items-center min-h-screen bg-white px-6">
      <div className="w-full max-w-sm">
        <h1 className="text-2xl font-bold text-gray-900 text-center mb-3">
          프로필 설정
        </h1>
        <p className="text-gray-500 text-sm text-center mb-8">

        </p>

        <form onSubmit={handleSubmit} className="space-y-5">
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

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              이름
            </label>
            <input
              type="text"
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="이름을 입력해주세요"
              className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-black"
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              닉네임
            </label>
            <input
              type="text"
              value={nickname}
              onChange={(e) => setNickname(e.target.value)}
              placeholder="예: 베블리"
              className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-black"
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              팀 ID
            </label>
            <input
              type="text"
              value={teamId}
              onChange={(e) => setTeamId(e.target.value)}
              placeholder="예: 7기-3팀"
              className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-black"
            />
          </div>

          {error && <p className="text-red-500 text-sm text-center">{error}</p>}

          <button
            type="submit"
            disabled={loading}
            className={`w-full py-3 rounded-lg text-white font-semibold ${
              loading
                ? "bg-gray-400 cursor-not-allowed"
                : "bg-black hover:bg-gray-800"
            }`}
          >
            {loading ? "저장 중..." : "가입 완료"}
          </button>
        </form>

        <p className="text-sm text-center text-gray-400 mt-8">
          Google 계정으로 로그인한 사용자입니다.
        </p>
      </div>
    </div>
  );
}
