import { getToken } from "next-auth/jwt";
import { google } from "googleapis";
import { NextResponse } from "next/server";

export async function GET(req: Request) {
  const { searchParams } = new URL(req.url);
  const fileId = searchParams.get("fileId"); // 다운로드할 파일 ID

  const token = await getToken({ req, secret: process.env.NEXTAUTH_SECRET });
  if (!token?.accessToken) {
    return NextResponse.json({ error: "Not authenticated" }, { status: 401 });
  }

  const oauth2Client = new google.auth.OAuth2();
  oauth2Client.setCredentials({ access_token: token.accessToken as string });
  const drive = google.drive({ version: "v3", auth: oauth2Client });

  const response = await drive.files.get(
    { fileId: fileId as string, alt: "media" },
    { responseType: "stream" }
  );

  return new Response(response.data as any, {
    headers: { "Content-Type": "application/octet-stream" },
  });
}
