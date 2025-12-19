
import { NextRequest, NextResponse } from "next/server";
import { google } from "googleapis";
import { requireAuth } from "@/utils/supabase/auth";
import { getAuthenticatedGoogleClient } from "@/utils/googleAuth";

export async function DELETE(req: NextRequest) {
    try {
        const { searchParams } = new URL(req.url);
        const eventId = searchParams.get('eventId');

        if (!eventId) {
            return NextResponse.json({ error: "Event ID is required" }, { status: 400 });
        }

        const { user } = await requireAuth();
        const oauth2Client = await getAuthenticatedGoogleClient();
        const calendar = google.calendar({ version: 'v3', auth: oauth2Client });

        await calendar.events.delete({
            calendarId: 'primary',
            eventId: eventId
        });

        return NextResponse.json({ success: true });

    } catch (error: any) {
        console.error("Delete Event Error:", error);
        if (error.code === 401 || error.message?.includes('invalid_grant')) {
            return NextResponse.json({ error: "Google Token Expired. Please Re-login." }, { status: 401 });
        }
        return NextResponse.json({ error: error.message || "Internal Server Error" }, { status: 500 });
    }
}
