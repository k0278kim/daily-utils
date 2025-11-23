import { google } from "googleapis";
import { NextRequest, NextResponse } from "next/server";
import { getAuthenticatedGoogleClient } from "@/utils/googleAuth";
import { requireAuth } from "@/utils/supabase/auth";

// 에러 객체의 생김새를 정의합니다 (status가 있을 수도, 없을 수도 있음)
interface AppError {
  status?: number;
  message?: string;
}

export async function GET(
  req: NextRequest,
  { params }: { params: Promise<{ folderId: string }> }
) {
  try {
    const { supabase, user } = await requireAuth();
    const oauth2Client = await getAuthenticatedGoogleClient();

    const drive = google.drive({ version: "v3", auth: oauth2Client });

    const { folderId } = await params;
    console.log(`📂 폴더 ID(${folderId}) 조회 시도...`);

    const res = await drive.files.list({
      q: `'${folderId}' in parents and trashed = false`,
      fields: "files(id, name, mimeType, webViewLink, thumbnailLink)",
      includeItemsFromAllDrives: true,
      supportsAllDrives: true,
    });

    return NextResponse.json(res.data.files);

  } catch (error: unknown) { // 1. 여기서 any 대신 unknown을 씁니다.

    // 2. error를 우리가 정의한 AppError 타입으로 간주(Assertion)합니다.
    const err = error as AppError;

    // 유틸리티 함수에서 던진 에러 처리
    if (err.status === 401) {
      return NextResponse.json({ error: err.message }, { status: 401 });
    }

    // Google API 자체 에러 (invalid_grant 등)
    if (err.message?.includes('invalid_grant')) {
      return NextResponse.json({ error: "연동이 만료되었습니다. 재로그인하세요." }, { status: 401 });
    }

    console.error("API Error:", err);
    return NextResponse.json({ error: "Internal Server Error" }, { status: 500 });
  }
}