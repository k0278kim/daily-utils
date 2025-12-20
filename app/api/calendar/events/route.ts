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
        const calendarIds = searchParams.get("calendarIds"); // Comma-separated list of calendar IDs

        if (!timeMin || !timeMax) {
            return NextResponse.json({ error: "Missing time range parameters" }, { status: 400 });
        }

        const oauth2Client = await getAuthenticatedGoogleClient();
        const calendar = google.calendar({ version: "v3", auth: oauth2Client });

        // Parse calendar IDs, default to primary
        const calendarsToFetch = calendarIds
            ? calendarIds.split(',').map(id => id.trim())
            : ["primary"];

        console.log(`[API] Fetching events from calendars: ${calendarsToFetch.join(', ')}`);

        // Fetch events from all specified calendars in parallel
        const eventsPromises = calendarsToFetch.map(async (calId) => {
            try {
                const response = await calendar.events.list({
                    calendarId: calId,
                    timeMin: timeMin,
                    timeMax: timeMax,
                    singleEvents: true,
                    orderBy: "startTime",
                });

                // Add calendarId to each event for color coding
                return (response.data.items || []).map(event => ({
                    ...event,
                    calendarId: calId
                }));
            } catch (err) {
                console.error(`Failed to fetch calendar ${calId}:`, err);
                return []; // Return empty for this calendar if it fails
            }
        });

        const allEventsArrays = await Promise.all(eventsPromises);
        const allEvents = allEventsArrays.flat();

        console.log(`[API] Total events found: ${allEvents.length}`);

        return NextResponse.json(allEvents);

    } catch (err: any) {
        console.error("Calendar API Error:", err);
        const status = err.status || 500;
        const message = err.message || "Internal Server Error";
        return NextResponse.json({ error: message }, { status });
    }
}
