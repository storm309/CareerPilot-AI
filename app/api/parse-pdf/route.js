import { NextResponse } from "next/server";

import { enforceRateLimit } from "@/utils/rateLimit";
import { requireUser } from "@/utils/serverAuth";

// pdf-parse pulls in Node native modules, so this route cannot run on the Edge.
export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const MAX_BYTES = 5 * 1024 * 1024;
const MAX_CHARS = 20000;

export async function POST(req) {
  let email;

  try {
    // Without this any anonymous caller could burn CPU on arbitrary PDFs.
    ({ email } = await requireUser());
    enforceRateLimit(`pdf:${email}`, { limit: 10, windowMs: 60_000 });
  } catch (error) {
    return NextResponse.json({ error: error.message }, { status: 401 });
  }

  try {
    const formData = await req.formData();
    const file = formData.get("file");

    if (!file || typeof file.arrayBuffer !== "function") {
      return NextResponse.json({ error: "No file uploaded." }, { status: 400 });
    }

    if (file.type !== "application/pdf") {
      return NextResponse.json({ error: "Only PDF files are supported." }, { status: 400 });
    }

    if (file.size > MAX_BYTES) {
      return NextResponse.json(
        { error: "That file is too large. Maximum size is 5MB." },
        { status: 413 }
      );
    }

    const buffer = Buffer.from(await file.arrayBuffer());

    // A PDF always starts with the %PDF- header; anything else is mislabelled.
    if (buffer.subarray(0, 5).toString("latin1") !== "%PDF-") {
      return NextResponse.json(
        { error: "That file is not a valid PDF." },
        { status: 400 }
      );
    }

    // pdf-parse v2 dropped the callable default export in favour of the
    // PDFParse class - the old `(await import('pdf-parse')).default(buffer)`
    // call resolved to undefined and threw on every upload.
    const { PDFParse } = await import("pdf-parse");
    const parser = new PDFParse({ data: buffer });

    let text = "";
    let pages = 0;

    try {
      const parsed = await parser.getText();
      text = (parsed?.text ?? "").trim();
      pages = parsed?.total ?? parsed?.numpages ?? 0;
    } finally {
      // Releases the worker; without it the process holds the document open.
      await parser.destroy().catch(() => {});
    }

    if (!text) {
      return NextResponse.json(
        {
          error:
            "No text could be read from that PDF. Scanned or image-only resumes are not supported.",
        },
        { status: 422 }
      );
    }

    return NextResponse.json({
      text: text
        // pdf-parse injects a "-- 1 of 3 --" marker between pages; without this
        // those end up quoted verbatim inside the interview prompt.
        .replace(/^\s*--\s*\d+\s+of\s+\d+\s*--\s*$/gm, "")
        // Collapse the ragged whitespace PDF extraction leaves behind so the
        // prompt is not padded out with blank lines.
        .replace(/[ \t]+/g, " ")
        .replace(/\n{3,}/g, "\n\n")
        .trim()
        .slice(0, MAX_CHARS),
      pages,
    });
  } catch (error) {
    console.error("PDF parsing error:", error);

    if (/password|encrypt/i.test(String(error?.message))) {
      return NextResponse.json(
        { error: "That PDF is password protected. Please upload an unlocked copy." },
        { status: 422 }
      );
    }

    return NextResponse.json(
      { error: "Could not read that PDF. Please try a different file." },
      { status: 500 }
    );
  }
}
