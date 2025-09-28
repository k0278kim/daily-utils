import { getToken } from "next-auth/jwt";
import { google } from "googleapis";
import {NextRequest, NextResponse} from "next/server";

export async function POST(req: NextRequest) {
  try {
    const token = await getToken({ req, secret: process.env.NEXTAUTH_SECRET });
    if (!token?.accessToken) {
      return NextResponse.json({ error: "Not authenticated" }, { status: 401 });
    }

    // 요청에서 JSON 파라미터 받기
    const body = await req.json();
    const { folderId, name, content } = body;
    // 예: { folderId: "abc123", name: "hello.txt", content: "안녕하세요" }

    const oauth2Client = new google.auth.OAuth2();
    oauth2Client.setCredentials({ access_token: token.accessToken as string });

    const drive = google.drive({ version: "v3", auth: oauth2Client });

    const fileMetadata = {
      name,
      parents: [folderId], // 업로드할 폴더
    };

    const media = {
      mimeType: "text/plain",
      body: content, // 문자열 업로드
    };

    const file = await drive.files.create({
      requestBody: fileMetadata,
      media,
      fields: "id, webViewLink",
      supportsAllDrives: true, // 공유 드라이브 지원
    });

    return NextResponse.json(file.data);
  } catch (err) {
    if (err instanceof Error) {
      console.error("Drive API error:", err.message);
    } else {
      console.error("Unknown error:", err);
    }
    return NextResponse.json({ error: "Upload failed" }, { status: 500 });
  }
}