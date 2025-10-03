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
    console.log("teamData", teamData![0].id);
    const { data, error } = await supabase.from("praise").select("*").eq("team", teamData![0].id).select("*, team (*), praise_from (*), praise_to (*)");
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
