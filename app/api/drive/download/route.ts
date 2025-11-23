import { getToken } from "next-auth/jwt";
import { google } from "googleapis";
import {NextRequest, NextResponse} from "next/server";
import {getAuthenticatedGoogleClient} from "@/utils/googleAuth";
import {requireAuth} from "@/utils/supabase/auth";

export async function GET(req: NextRequest) {
  const { searchParams } = new URL(req.url);
  const fileId = searchParams.get("fileId"); // 다운로드할 파일 ID

  const { supabase, user } = await requireAuth();

  const oauth2Client = await getAuthenticatedGoogleClient();
  const drive = google.drive({ version: "v3", auth: oauth2Client });

  const response = await drive.files.get(
    { fileId: fileId as string, alt: "media" },
    { responseType: "stream" }
  );

  // eslint-disable-next-line @typescript-eslint/ban-ts-comment
  // @ts-expect-error
  return new Response(response.data, {
    headers: { "Content-Type": "application/octet-stream" },
  });
}
