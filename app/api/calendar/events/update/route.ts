import { NextRequest, NextResponse } from 'next/server';
import { google } from 'googleapis';
import { getAuthenticatedGoogleClient } from '@/utils/googleAuth';
import { requireAuth } from '@/utils/supabase/auth';

export async function PATCH(req: NextRequest) {
    try {
        const user = await requireAuth();
        const body = await req.json();
        const { eventId, summary, description, location, start, end } = body;

        if (!eventId) {
            return NextResponse.json({ error: 'Event ID is required' }, { status: 400 });
        }

        const oauth2Client = await getAuthenticatedGoogleClient(user.id);
        const calendar = google.calendar({ version: 'v3', auth: oauth2Client });

        const eventPatch: any = {
            summary,
            description,
            location,
        };

        if (start) eventPatch.start = start;
        if (end) eventPatch.end = end;

        const response = await calendar.events.patch({
            calendarId: 'primary',
            eventId: eventId,
            requestBody: eventPatch,
        });

        return NextResponse.json(response.data);
    } catch (error: any) {
        console.error('Error updating event:', error);
        return NextResponse.json({ error: error.message || 'Internal Server Error' }, { status: 500 });
    }
}
