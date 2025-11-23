import { getToken } from "next-auth/jwt";
import {NextRequest, NextResponse} from "next/server";
import {supabase} from "@/lib/supabaseClient";
import {requireAuth} from "@/utils/supabase/auth";

export async function GET(req: NextRequest) {
  const { searchParams } = new URL(req.url);
  const userId = searchParams.get("uuid");

  console.log("user_id", userId);

  try {
    const { supabase, user } = await requireAuth();

    const { data, error } = await supabase.from("japdori").select("*").eq("japdori_to", userId)//.select("*, praise_from (*), praise_to (*), team (*)")
    console.error("error", error);
    return NextResponse.json(data);

  } catch (err) {
    if (err instanceof Error) {
      console.error("error", err.message);
    } else {
      console.error("Unknown error:", err);
    }
    return NextResponse.json({ error: "Internal Server Error" }, { status: 500 });
  }
}
