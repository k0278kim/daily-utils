import { google } from "googleapis";
import { NextRequest, NextResponse } from "next/server";
import { getAuthenticatedGoogleClient } from "@/utils/googleAuth";
import {requireAuth} from "@/utils/supabase/auth"; // 방금 만든 유틸 import

export async function GET(
  req: NextRequest,
  { params }: { params: Promise<{ folderId: string }> }
) {
  try {
    const { supabase, user } = await requireAuth();
    // ✅ [핵심] 그 길었던 인증/토큰갱신 로직이 단 한 줄로 끝납니다!
    const oauth2Client = await getAuthenticatedGoogleClient();

    // 1. Drive 클라이언트 생성 시 auth에 넣어주기만 하면 됨
    const drive = google.drive({ version: "v3", auth: oauth2Client });

    const { folderId } = await params;
    console.log(`📂 폴더 ID(${folderId}) 조회 시도...`);

    // 2. API 호출
    const res = await drive.files.list({
      q: `'${folderId}' in parents and trashed = false`,
      fields: "files(id, name, mimeType, webViewLink, thumbnailLink)",
      includeItemsFromAllDrives: true,
      supportsAllDrives: true,
    });

    return NextResponse.json(res.data.files);

  } catch (err: any) {
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