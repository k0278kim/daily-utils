import { getToken } from "next-auth/jwt";
import { google } from "googleapis";
import {NextRequest, NextResponse} from "next/server";

export async function POST(req: NextRequest) {
  try {
    const token = await getToken({ req, secret: process.env.NEXTAUTH_SECRET });
    if (!token?.accessToken) {
      return NextResponse.json({ error: "Not authenticated" }, { status: 401 });
    }

    const { fileId } = await req.json();
    if (!fileId) {
      return NextResponse.json({ error: "fileId is required" }, { status: 400 });
    }

    const oauth2Client = new google.auth.OAuth2();
    oauth2Client.setCredentials({ access_token: token.accessToken as string });
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