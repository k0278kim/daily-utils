import { NextRequest, NextResponse } from "next/server";
import { getAuthenticatedGoogleClient } from "@/utils/googleAuth";
import { google } from "googleapis";
import { requireAuth } from "@/utils/supabase/auth";

export const dynamic = 'force-dynamic';

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

        // [NEW] Fetch profiles for attendees from Supabase
        const emails = new Set<string>();
        allEvents.forEach((event: any) => {
            event.attendees?.forEach((att: any) => {
                if (att.email) emails.add(att.email.toLowerCase());
            });
        });

        if (emails.size > 0) {
            const { createClient } = await import("@supabase/supabase-js");

            // Use Service Role to bypass RLS
            const supabaseAdmin = createClient(
                process.env.NEXT_PUBLIC_SUPABASE_URL!,
                process.env.SUPABASE_SERVICE_ROLE_KEY!,
                {
                    auth: {
                        autoRefreshToken: false,
                        persistSession: false,
                    },
                }
            );

            // Query 'profiles' table with admin privileges
            const { data: profiles, error } = await supabaseAdmin
                .from('profiles')
                .select('email, avatar_url, name')
                .in('email', Array.from(emails));

            if (error) {
                console.error("[API] Profile Fetch Error:", error);
            }

            console.log(`[API] Emails to fetch: ${emails.size}, Profiles found: ${profiles?.length || 0}`);

            if (profiles) {
                // Normalize keys to lowercase for matching
                const profileMap = new Map(profiles.map((p: any) => [p.email.toLowerCase(), p]));

                let enrichedCount = 0;
                allEvents.forEach((event: any) => {
                    event.attendees?.forEach((att: any) => {
                        if (!att.email) return;

                        const profile = profileMap.get(att.email.toLowerCase());
                        if (profile) {
                            att.avatarUrl = profile.avatar_url;
                            if (profile.avatar_url) enrichedCount++;
                            // Optional: Use profile name if Google displayName is missing
                            if (!att.displayName) att.displayName = profile.name;
                        }
                    });
                });
                console.log(`[API] Total enriched attendees with avatars: ${enrichedCount}`);
            }
        }

        console.log(`[API] Total events found: ${allEvents.length}`);

        return NextResponse.json(allEvents);

    } catch (err: any) {
        console.error("Calendar API Error:", err);
        const status = err.status || 500;
        const message = err.message || "Internal Server Error";
        return NextResponse.json({ error: message }, { status });
    }
}
