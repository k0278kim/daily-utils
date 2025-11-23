import { getToken } from "next-auth/jwt";
import {NextRequest, NextResponse} from "next/server";
import {supabase} from "@/lib/supabaseClient";
import {createClient} from "@/utils/supabase/server";
import {requireAuth} from "@/utils/supabase/auth";

export async function GET(req: NextRequest) {

  const { searchParams } = new URL(req.url);
  const userId = searchParams.get("user_id");

  try {
    const { supabase, user } = await requireAuth();

    const { data, error } = await supabase.from("vacation_usage")
      .select("*, team (*)")
      .eq("user_id", userId)
    return NextResponse.json(data);

  } catch (err) {
    if (err instanceof Error) {
      console.error("profile API error:", err.message);
    } else {
      console.error("Unknown error:", err);
    }
    return NextResponse.json({ error: "Internal Server Error" }, { status: 500 });
  }
}
