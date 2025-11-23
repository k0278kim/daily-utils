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
    const { data, error } = await supabase.from("profiles").select("*").eq("team_id", teamData![0].id);
    return NextResponse.json(data);

  } catch (err) {
    if (err instanceof Error) {
      console.error("Drive API error:", err.message);
    } else {
      console.error("Unknown error:", err);
    }
    return NextResponse.json({ error: "Internal Server Error" }, { status: 500 });
  }
}
