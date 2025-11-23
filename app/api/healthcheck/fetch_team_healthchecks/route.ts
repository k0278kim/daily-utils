import { getToken } from "next-auth/jwt";
import {NextRequest, NextResponse} from "next/server";
import {supabase} from "@/lib/supabaseClient";
import {createClient} from "@/utils/supabase/server";
import {requireAuth} from "@/utils/supabase/auth";

export async function GET(req: NextRequest) {
  const { searchParams } = new URL(req.url);
  const teamName = searchParams.get("team_name");
  const startDate = searchParams.get("start_date");
  const endDate = searchParams.get("end_date");

  const end = new Date(endDate+"T23:59:59+09:00").toISOString();

  try {
    const { supabase, user } = await requireAuth();

    const teamRes = await supabase.from("team").select("*").eq("name", teamName);
    const teamData = teamRes.data;
    const { data, error } = await supabase
      .from("healthcheck")
      .select("*, questions (questions), team (*) created_user (*)")
      .eq("team", teamData![0].id)
      .gte("date", startDate)
      .lte("date", end);

    console.log(teamData, data, startDate, endDate);
    return NextResponse.json(data);

  } catch (err) {
    if (err instanceof Error) {
      console.error("error:", err.message);
    } else {
      console.error("Unknown error:", err);
    }
    return NextResponse.json({ error: "Internal Server Error" }, { status: 500 });
  }
}
