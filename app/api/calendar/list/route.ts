import { NextRequest, NextResponse } from "next/server";
import { getAuthenticatedGoogleClient } from "@/utils/googleAuth";
import { google } from "googleapis";
import { requireAuth } from "@/utils/supabase/auth";

export async function GET(req: NextRequest) {
    try {
        await requireAuth();

        const oauth2Client = await getAuthenticatedGoogleClient();
        const calendar = google.calendar({ version: "v3", auth: oauth2Client });

        // Fetch list of calendars the user has access to
        const response = await calendar.calendarList.list({
            showHidden: false,
            minAccessRole: 'reader' // Include calendars where user has at least read access
        });

        // Map to simpler structure
        const calendars = (response.data.items || []).map(cal => ({
            id: cal.id,
            summary: cal.summary,
            description: cal.description,
            backgroundColor: cal.backgroundColor,
            foregroundColor: cal.foregroundColor,
            primary: cal.primary || false,
            accessRole: cal.accessRole
        }));

        return NextResponse.json(calendars);

    } catch (err: any) {
        console.error("Calendar List API Error:", err);
        const status = err.status || 500;
        const message = err.message || "Internal Server Error";
        return NextResponse.json({ error: message }, { status });
    }
}
