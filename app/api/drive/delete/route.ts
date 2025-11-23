import { getToken } from "next-auth/jwt";
import { google } from "googleapis";
import {NextRequest, NextResponse} from "next/server";
import {getAuthenticatedGoogleClient} from "@/utils/googleAuth";
import {requireAuth} from "@/utils/supabase/auth";

export async function POST(req: NextRequest) {
  try {
    const { supabase, user } = await requireAuth();

    const { fileId } = await req.json();
    if (!fileId) {
      return NextResponse.json({ error: "fileId is required" }, { status: 400 });
    }

    const oauth2Client = await getAuthenticatedGoogleClient();
    const drive = google.drive({ version: "v3", auth: oauth2Client });

    await drive.files.delete({
      fileId,
      supportsAllDrives: true, // 공유드라이브 지원
    });

    return NextResponse.json({ success: true, fileId });
  } catch (err) {
    if (err instanceof Error) {
      console.error("Drive API error:", err.message);
    } else {
      console.error("Unknown error:", err);
    }
    return NextResponse.json({ error: "Delete failed" }, { status: 500 });
  }
}