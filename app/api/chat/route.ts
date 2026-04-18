// app/api/chat/route.ts
import { NextRequest, NextResponse } from 'next/server';

const API_URL = process.env.FASTAPI_URL || 'http://localhost:8000';

export async function POST(request: NextRequest) {
    try {
        const body = await request.json();

        const response = await fetch(`${API_URL}/api/chat`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
            },
            body: JSON.stringify(body),
        });

        if (!response.ok) {
            const errorText = await response.text();
            throw new Error(`Backend error: ${response.status} - ${errorText}`);
        }

        const data = await response.json();
        return NextResponse.json(data);

    } catch (error: any) {
        console.error('[CHAT API] Error:', error);
        return NextResponse.json(
            {
                error: 'Failed to process request',
                details: error.message
            },
            { status: 500 }
        );
    }
}