import { NextResponse } from 'next/server';

// Force Node.js runtime - pdf-parse requires Node.js native modules
export const runtime = 'nodejs';

export async function POST(req) {
    try {
        const formData = await req.formData();
        const file = formData.get('file');

        if (!file) {
            return NextResponse.json({ error: "No file uploaded" }, { status: 400 });
        }

        // Check file type
        if (file.type !== 'application/pdf') {
            return NextResponse.json({ error: "Only PDF files are supported" }, { status: 400 });
        }

        // Check file size (max 5MB)
        if (file.size > 5 * 1024 * 1024) {
            return NextResponse.json({ error: "File too large. Maximum 5MB allowed." }, { status: 400 });
        }

        const buffer = Buffer.from(await file.arrayBuffer());

        // Dynamically import pdf-parse to avoid issues with Next.js bundling
        const pdfParse = (await import('pdf-parse')).default;
        const parsedData = await pdfParse(buffer);

        if (!parsedData.text || parsedData.text.trim().length === 0) {
            return NextResponse.json({ error: "Could not extract text from PDF. The file may be scanned/image-based." }, { status: 422 });
        }

        return NextResponse.json({ 
            text: parsedData.text.trim(),
            pages: parsedData.numpages
        });
    } catch (error) {
        console.error("PDF Parsing error:", error);
        return NextResponse.json({ 
            error: "Failed to parse PDF. Please try a different file." 
        }, { status: 500 });
    }
}
