// app/api/chat/route.ts
import { NextRequest, NextResponse } from 'next/server';

let rawUrl = process.env.BACKEND_API_URL || process.env.FASTAPI_URL || 'http://127.0.0.1:8000';

// Foolproof logic: automatically add https:// if missing
if (!rawUrl.startsWith('http')) {
    rawUrl = 'https://' + rawUrl;
}

// Foolproof logic: if user pastes the Hugging Face webpage URL instead of the direct API URL, fix it automatically
if (rawUrl.includes('huggingface.co/spaces/')) {
    const spacePath = rawUrl.split('huggingface.co/spaces/')[1].replace(/\/$/, '');
    const [org, name] = spacePath.split('/');
    rawUrl = `https://${org}-${name}.hf.space`;
}

const API_URL = rawUrl.replace(/\/$/, '');

// Allow Vercel up to 60 seconds to wait for Render's cold start
export const maxDuration = 60;

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