import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/utils/supabase/server";
import {requireAuth} from "@/utils/supabase/auth"; // 방금 만든 거 import

export async function GET(req: NextRequest) {
  const { searchParams } = new URL(req.url);
  const email = searchParams.get("email");

  const { supabase, user } = await requireAuth();

  // DB 조회
  const { data, error } = await supabase
    .from("profiles")
    .select("*")
    .eq("email", email);

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });

  return NextResponse.json(data);
}