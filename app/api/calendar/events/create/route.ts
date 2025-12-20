import { NextRequest, NextResponse } from 'next/server';
import { google } from 'googleapis';
import { getAuthenticatedGoogleClient } from '@/utils/googleAuth';
import { requireAuth } from '@/utils/supabase/auth';

export async function POST(req: NextRequest) {
    try {
        const user = await requireAuth();
        const body = await req.json();
        const { summary, description, location, start, end } = body;

        if (!start || !end) {
            return NextResponse.json({ error: 'Start and End times are required' }, { status: 400 });
        }

        const oauth2Client = await getAuthenticatedGoogleClient();
        const calendar = google.calendar({ version: 'v3', auth: oauth2Client });

        const event = {
            summary: summary || '새로운 일정',
            description,
            location,
            start,
            end,
            attendees: body.attendees || [],
        };

        const response = await calendar.events.insert({
            calendarId: 'primary',
            requestBody: event,
        });

        return NextResponse.json(response.data);
    } catch (error: any) {
        console.error('Error creating event:', error);
        return NextResponse.json({ error: error.message || 'Internal Server Error' }, { status: 500 });
    }
}
