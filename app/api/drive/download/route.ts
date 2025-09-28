import { getToken } from "next-auth/jwt";
import { google } from "googleapis";
import {NextRequest, NextResponse} from "next/server";

export async function GET(req: NextRequest) {
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

  // eslint-disable-next-line @typescript-eslint/ban-ts-comment
  // @ts-expect-error
  return new Response(response.data, {
    headers: { "Content-Type": "application/octet-stream" },
  });
}
