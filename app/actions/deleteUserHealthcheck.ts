"use server";

import { createClient } from "@supabase/supabase-js";
import { User } from "@/model/user";
import {HealthcheckResponse} from "@/model/healthcheck";
import fetchUserHealthchecks from "@/app/api/healthcheck/fetch_user_healthchecks/fetchUserHealthchecks";
import {supabase} from "@/lib/supabaseClient";
import {Team} from "@/model/team";
import {NextResponse} from "next/server";

export async function deleteUserHealthcheck(teamName: string, createdUser: string, date: string) {
  const teamRes = await supabase.from("team").select("*").eq("name", teamName);
  const teamData: Team[] = teamRes.data as Team[];
  const end = new Date(date+"T23:59:59+09:00").toISOString();

  const {data, error} = await supabase
    .from("healthcheck")
    .delete()
    .eq("team", teamData![0].id)
    .eq("created_user", createdUser)
    .gte("date", date)
    .lte("date", end)
  if (error) throw new Error(error.message);
  return data;
}
