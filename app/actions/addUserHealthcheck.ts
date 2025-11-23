"use server";

import { createClient } from "@supabase/supabase-js";
import { HealthcheckResponse } from "@/model/healthcheck";
import { Team } from "@/model/team";

export async function addUserHealthcheck(
  teamName: string,
  createdUser: string,
  date: string,
  responses: HealthcheckResponse[]
) {
  // 1. [핵심] 관리자 권한(Service Role)으로 클라이언트 생성
  // 이 클라이언트는 RLS(보안 정책)를 전부 무시하고 데이터를 쓸 수 있습니다.
  const supabaseAdmin = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!, // .env.local에 이 키가 있어야 합니다!
    {
      auth: {
        autoRefreshToken: false,
        persistSession: false,
      },
    }
  );

  // 2. 팀 정보 조회 (supabaseAdmin 사용)
  const teamRes = await supabaseAdmin.from("team").select("*").eq("name", teamName);

  if (teamRes.error || !teamRes.data || teamRes.data.length === 0) {
    throw new Error(`팀을 찾을 수 없습니다: ${teamName}`);
  }

  const teamData: Team[] = teamRes.data as Team[];

  // 날짜 계산
  const end = new Date(date + "T23:59:59+09:00").toISOString();

  // 3. 중복 체크 (supabaseAdmin 사용)
  const { data: tempData, error: tempError } = await supabaseAdmin
    .from("healthcheck")
    .select("id") // 성능을 위해 필요한 필드만 조회
    .eq("team", teamData[0].id)
    .eq("created_user", createdUser)
    .gte("date", date)
    .lte("date", end);

  console.log("Team:", teamData[0].name, "| Existing Check:", tempData?.length, "| Error:", tempError);

  if (tempError) {
    throw new Error(`조회 중 에러 발생: ${tempError.message}`);
  }

  // 4. 데이터가 없으면 저장 (supabaseAdmin 사용 -> RLS 무시하고 저장됨)
  if (tempData && tempData.length === 0) {
    const { data, error } = await supabaseAdmin
      .from("healthcheck")
      .insert({
        created_user: createdUser,
        questions_id: teamData[0].healthcheck_id,
        team: teamData[0].id,
        responses: responses,
        date: date
      })
      .select(); // insert 결과를 받으려면 select() 필요

    if (error) {
      console.error("Insert Error Details:", error);
      throw new Error(error.message);
    }
    return data;
  } else {
    throw new Error("오류: 이미 해당 날짜의 health check를 작성했습니다.");
  }
}