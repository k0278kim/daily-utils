import { getToken } from "next-auth/jwt";
import { google } from "googleapis";
import {NextRequest, NextResponse} from "next/server";

export async function GET(req: NextRequest, { params }: { params: Promise<{ folderId: string }>} ) {
  try {
    const token = await getToken({ req, secret: process.env.NEXTAUTH_SECRET });
    if (!token?.accessToken) {
      return NextResponse.json({ error: "Not authenticated" }, { status: 401 });
    }

    const oauth2Client = new google.auth.OAuth2();
    oauth2Client.setCredentials({ access_token: token.accessToken as string });
    const drive = google.drive({ version: "v3", auth: oauth2Client });

    const { folderId } = await params;
    console.log(folderId);

    const res = await drive.files.list({
      q: `'${folderId}' in parents`,
      fields: "files(id, name, mimeType, webViewLink)",
      includeItemsFromAllDrives: true,
      supportsAllDrives: true,
    });

    return NextResponse.json(res.data.files);
  } catch (err) {
    if (err instanceof Error) {
      console.error("Drive API error:", err.message);
    } else {
      console.error("Unknown error:", err);
    }
    return NextResponse.json({ error: "Internal Server Error" }, { status: 500 });
  }
}