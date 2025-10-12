import { getToken } from "next-auth/jwt";
import {NextRequest, NextResponse} from "next/server";
import {supabase} from "@/lib/supabaseClient";

export async function GET(req: NextRequest) {
  const { searchParams } = new URL(req.url);
  const teamName = searchParams.get("team_name");
  const userId = searchParams.get("user_id");
  const startDate = searchParams.get("start_date");
  const endDate = searchParams.get("end_date");

  const end = new Date(endDate+"T23:59:59+09:00").toISOString();

  try {
    const token = await getToken({ req, secret: process.env.NEXTAUTH_SECRET });
    if (!token?.accessToken) {
      return NextResponse.json({ error: "Not authenticated" }, { status: 401 });
    }

    const teamRes = await supabase.from("team").select("*").eq("name", teamName);
    const teamData = teamRes.data;
    const { data, error } = await supabase
      .from("healthcheck")
      .select("*, questions_id (questions), team (*), created_user (*)")
      .eq("team", teamData![0].id)
      .eq("created_user", userId)
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
