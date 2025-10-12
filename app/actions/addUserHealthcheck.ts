"use server";

import { createClient } from "@supabase/supabase-js";
import { User } from "@/model/user";
import {HealthcheckResponse} from "@/model/healthcheck";
import fetchUserHealthchecks from "@/app/api/healthcheck/fetch_user_healthchecks/fetchUserHealthchecks";
import {supabase} from "@/lib/supabaseClient";
import {Team} from "@/model/team";
import {NextResponse} from "next/server";

export async function addUserHealthcheck(teamName: string, createdUser: string, date: string, responses: HealthcheckResponse[]) {
  const teamRes = await supabase.from("team").select("*").eq("name", teamName);
  const teamData: Team[] = teamRes.data as Team[];
  const end = new Date(date+"T23:59:59+09:00").toISOString();
  const { data: tempData, error: tempError } = await supabase
    .from("healthcheck")
    .select("*, questions_id (questions), team (*), created_user (*)")
    .eq("team", teamData![0].id)
    .eq("created_user", createdUser)
    .gte("date", date)
    .lte("date", end);

  console.log(teamData, tempData, date);

  if (tempData!.length == 0) {
    const {data, error} = await supabase
      .from("healthcheck")
      .insert({
        created_user: createdUser,
        questions_id: teamData[0].healthcheck_id,
        team: teamData[0].id,
        responses: responses,
        date: date
      })
    if (error) throw new Error(error.message);
    return data;
  } else {
    throw new Error("오류: 이미 해당 날짜의 health check를 작성했습니다.");
  }
}
