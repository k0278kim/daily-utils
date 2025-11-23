import { getToken } from "next-auth/jwt";
import {NextRequest, NextResponse} from "next/server";
import {supabase} from "@/lib/supabaseClient";
import {requireAuth} from "@/utils/supabase/auth";

export async function POST(req: NextRequest) {

  try {
    const { supabase, user } = await requireAuth();

    const body = await req.json();
    body.api_id = process.env.NEXT_PUBLIC_SNIPPET_API_ID as string;
    console.log(body);

    const res = await fetch("https://n8n.1000.school/webhook/0a43fbad-cc6d-4a5f-8727-b387c27de7c8/", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(body)
    });

    const data = await res.json();
    return NextResponse.json({ received: data });

  } catch (err) {
    if (err instanceof Error) {
      console.error("Drive API error:", err.message);
    } else {
      console.error("Unknown error:", err);
    }
    return NextResponse.json({ error: "Internal Server Error" }, { status: 500 });
  }
}
