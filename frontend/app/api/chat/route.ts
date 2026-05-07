// app/api/chat/route.ts
import { NextRequest, NextResponse } from 'next/server';

let rawUrl = process.env.BACKEND_API_URL || process.env.FASTAPI_URL || 'http://127.0.0.1:8000';
console.log("🛠️ Initial Backend URL from Env:", rawUrl);

// Foolproof logic: automatically add https:// if missing
if (!rawUrl.startsWith('http') && !rawUrl.includes('localhost') && !rawUrl.includes('127.0.0.1')) {
    rawUrl = 'https://' + rawUrl;
}

// Aggressive HF Fix: Handle any Hugging Face URL format
if (rawUrl.includes('huggingface.co')) {
    const parts = rawUrl.replace('https://', '').replace('http://', '').split('/');
    // Format is usually huggingface.co/spaces/org/name or huggingface.co/org/name
    const spaceIndex = parts.indexOf('spaces');
    let org, name;
    
    if (spaceIndex !== -1 && parts.length > spaceIndex + 2) {
        org = parts[spaceIndex + 1];
        name = parts[spaceIndex + 2];
    } else if (parts.length >= 2) {
        // If "spaces" is missing, assume huggingface.co/org/name
        org = parts[1];
        name = parts[2];
    }

    if (org && name) {
        rawUrl = `https://${org.toLowerCase()}-${name.toLowerCase()}.hf.space`;
        console.log("✅ Converted to Direct HF API:", rawUrl);
    }
}

const API_URL = rawUrl.replace(/\/$/, '');
console.log("📡 Final Target API URL:", `${API_URL}/api/chat`);

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