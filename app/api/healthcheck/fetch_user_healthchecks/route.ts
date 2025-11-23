import { getToken } from "next-auth/jwt";
import {NextRequest, NextResponse} from "next/server";
import {supabase} from "@/lib/supabaseClient";
import {createClient} from "@/utils/supabase/server";
import {requireAuth} from "@/utils/supabase/auth";

export async function GET(req: NextRequest) {
  const { searchParams } = new URL(req.url);
  const userId = searchParams.get("user_id");
  const startDate = searchParams.get("start_date");
  const endDate = searchParams.get("end_date");

  const end = new Date(endDate+"T23:59:59+09:00").toISOString();

  try {
    const { supabase, user } = await requireAuth();

    if (!userId || userId === "undefined" || userId === "null") {
      return NextResponse.json(
        { error: "유효하지 않은 user_id 입니다." },
        { status: 400 }
      );
    }

    const { data, error } = await supabase
      .from("healthcheck")
      .select("*, questions_id (questions), team (*), created_user (*)")
      .eq("created_user", userId)
      .gte("date", startDate)
      .lte("date", end);

   console.log(error);

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
