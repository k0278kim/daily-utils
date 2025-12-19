import { NextRequest, NextResponse } from "next/server";
import { getAuthenticatedGoogleClient } from "@/utils/googleAuth";
import { google } from "googleapis";
import { requireAuth } from "@/utils/supabase/auth";

export async function GET(req: NextRequest) {
    try {
        await requireAuth(); // Ensure user is logged in to the app

        const { searchParams } = new URL(req.url);
        const timeMin = searchParams.get("timeMin");
        const timeMax = searchParams.get("timeMax");

        if (!timeMin || !timeMax) {
            return NextResponse.json({ error: "Missing time range parameters" }, { status: 400 });
        }

        const oauth2Client = await getAuthenticatedGoogleClient();
        const calendar = google.calendar({ version: "v3", auth: oauth2Client });

        console.log(`[API] Fetching Google Calendar events: ${timeMin} ~ ${timeMax}`);

        const response = await calendar.events.list({
            calendarId: "primary",
            timeMin: timeMin,
            timeMax: timeMax,
            singleEvents: true,
            orderBy: "startTime",
        });

        console.log(`[API] Events found: ${response.data.items?.length || 0}`);

        return NextResponse.json(response.data.items || []);

    } catch (err: any) {
        console.error("Calendar API Error:", err);
        const status = err.status || 500;
        const message = err.message || "Internal Server Error";
        return NextResponse.json({ error: message }, { status });
    }
}
