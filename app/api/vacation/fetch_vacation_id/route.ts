import { getToken } from "next-auth/jwt";
import {NextRequest, NextResponse} from "next/server";
import {supabase} from "@/lib/supabaseClient";

export async function GET(req: NextRequest) {

  const { searchParams } = new URL(req.url);
  const teamName = searchParams.get("team_name");
  try {
    const token = await getToken({ req, secret: process.env.NEXTAUTH_SECRET });
    if (!token?.accessToken) {
      return NextResponse.json({ error: "Not authenticated" }, { status: 401 });
    }

    const teamRes = await supabase.from("team").select("*").eq("name", teamName);
    const teamData = teamRes.data;
    const { data, error } = await supabase.from("vacation_id").select("*").eq("team", teamData![0].id).eq("enabled", true);
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
