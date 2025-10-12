"use server";

import {HealthcheckResponse} from "@/model/healthcheck";
import {supabase} from "@/lib/supabaseClient";


export async function updateUserHealthcheck(teamName: string, createdUser: string, date: string, responses: HealthcheckResponse[]) {
  const teamRes = await supabase.from("team").select("*").eq("name", teamName);
  const teamData = teamRes.data;
  const end = new Date(date+"T23:59:59+09:00").toISOString();
  const { data, error } = await supabase
    .from("healthcheck")
    .update({
      responses: responses
    })
    .eq("team", teamData![0].id)
    .eq("created_user", createdUser)
    .gte("date", date)
    .lte("date", end);

  if (error) throw new Error(error.message);
  return data;
}
