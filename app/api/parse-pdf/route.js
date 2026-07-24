import { NextResponse } from 'next/server';
const pdfParse = require('pdf-parse');

export async function POST(req) {
    try {
        const formData = await req.formData();
        const file = formData.get('file');

        if (!file) {
            return NextResponse.json({ error: "No file uploaded" }, { status: 400 });
        }

        const buffer = await file.arrayBuffer();

        // pdfParse requires a Buffer, not ArrayBuffer directly in some envs
        const parsedData = await pdfParse(Buffer.from(buffer));

        return NextResponse.json({ text: parsedData.text });
    } catch (error) {
        console.error("PDF Parsing error:", error);
        return NextResponse.json({ error: "Failed to parse PDF" }, { status: 500 });
    }
}
