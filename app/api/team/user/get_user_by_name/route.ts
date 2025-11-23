import { getToken } from "next-auth/jwt";
import {NextRequest, NextResponse} from "next/server";
import {User} from "@/model/user";
import fetchTeamUsers from "@/app/api/team/user/get_team_users/fetch_team_users";
import {supabase} from "@/lib/supabaseClient";
import {createClient} from "@/utils/supabase/server";
import {requireAuth} from "@/utils/supabase/auth";

export async function GET(req: NextRequest) {

  const { searchParams } = new URL(req.url);
  const userName = searchParams.get("user_name");
  const teamName = searchParams.get("team_name");
  try {
    const { supabase, user } = await requireAuth();

    if (teamName && userName) {
      const teamRes = await supabase.from("team").select("*").eq("name", teamName);
      const teamData = teamRes.data;
      const { data: teamUsers, error } = await supabase.from("profiles").select("*").eq("team_id", teamData![0].id);
      return NextResponse.json({ users: teamUsers!.filter((user: User) => user.name === userName) });
    } else {
      return NextResponse.json({ error: "Invalid team_name or user_name" });
    }

  } catch (err) {
    if (err instanceof Error) {
      console.error("Drive API error:", err.message);
    } else {
      console.error("Unknown error:", err);
    }
    return NextResponse.json({ error: "Internal Server Error" }, { status: 500 });
  }
}