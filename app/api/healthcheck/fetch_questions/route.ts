import { getToken } from "next-auth/jwt";
import {NextRequest, NextResponse} from "next/server";
import {supabase} from "@/lib/supabaseClient";
import {createClient} from "@/utils/supabase/server";
import {requireAuth} from "@/utils/supabase/auth";

export async function GET(req: NextRequest) {
  const { searchParams } = new URL(req.url);
  const teamName = searchParams.get("team_name");

  try {
    const { supabase, user } = await requireAuth();

    const teamRes = await supabase.from("team").select("*").eq("name", teamName);
    const teamData = teamRes.data;
    console.log("teamData", teamData![0].id);
    const { data, error } = await supabase.from("healthcheck_questions").select("*, team (*)").eq("team", teamData![0].id).eq("id", teamData![0].healthcheck_id);
    console.log(teamData, data);
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
