
import { NextRequest, NextResponse } from "next/server";
import { requireAuth } from "@/utils/supabase/auth";
import { getAuthenticatedGoogleClient } from "@/utils/googleAuth";
import { google } from "googleapis";

export async function POST(req: NextRequest) {
    try {
        await requireAuth();

        const { calendarId, eventId, responseStatus } = await req.json();

        if (!calendarId || !eventId || !responseStatus) {
            return NextResponse.json({ error: "Missing required fields" }, { status: 400 });
        }

        const oauth2Client = await getAuthenticatedGoogleClient();
        const calendar = google.calendar({ version: "v3", auth: oauth2Client });

        // 1. Get the event to find the current user's attendee entry
        const event = await calendar.events.get({
            calendarId,
            eventId,
        });

        if (!event.data || !event.data.attendees) {
            return NextResponse.json({ error: "Event or attendees not found" }, { status: 404 });
        }

        // 2. Find the attendee. 
        // Note: Google Calendar API 'get' usually marks the authenticated user with 'self: true'.
        // If not, we might need to match by email, but 'self' is safest if available.
        // However, 'patch' requires updating the full attendee list or specific fields.
        // Actually, 'events.patch' allows partial updates. But for attendees, we usually need to
        // provide the modified attendee object in the list?
        // Let's try iterating and modifying the matching attendee.

        const attendees = event.data.attendees;
        const userAttendeeIndex = attendees.findIndex(a => a.self || a.email === (oauth2Client.credentials as any).email); // simplified check

        // A better way: The user is authenticated via OAuth. 
        // The safest way is to patch the *specific* attendee if we knew the logic, 
        // but typically we update the list.
        // Actually, for RSVP, we can use the `import` method? No.

        // Let's rely on 'self' property which Google returns for the auth'd user.
        let targetAttendee = attendees.find(a => a.self);

        // If 'self' property is missing (sometimes happens), we might need another way.
        // But for now, let's assume 'self' is present as we saw it in the frontend response.

        if (!targetAttendee) {
            // Fallback: try to match by email if we had the user's email.
            // For now, return error if self not found.
            // Actually, we can just update the 'responseStatus' of the attendee whose email matches.
            // But we need the email.
            return NextResponse.json({ error: "Could not identify user in attendee list" }, { status: 400 });
        }

        // 3. Update status
        targetAttendee.responseStatus = responseStatus;

        // 4. Patch the event
        // We pass the entire attendees list with the modification.
        // This is safe because we just fetched it.
        const response = await calendar.events.patch({
            calendarId,
            eventId,
            requestBody: {
                attendees: attendees
            }
        });

        return NextResponse.json(response.data);

    } catch (err: any) {
        console.error("Failed to update RSVP:", err);
        return NextResponse.json({ error: err.message || "Failed to update RSVP" }, { status: 500 });
    }
}
