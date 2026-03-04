import { NextRequest, NextResponse } from "next/server";

const DEEPL_API_KEY = process.env.DEEPL_API_KEY;
const DEEPL_BASE = DEEPL_API_KEY?.endsWith(":fx")
  ? "https://api-free.deepl.com"
  : "https://api.deepl.com";

export async function POST(req: NextRequest) {
  if (!DEEPL_API_KEY) {
    return NextResponse.json(
      { error: "DeepL API key not configured" },
      { status: 500 }
    );
  }

  const { text, sourceLang, targetLang } = await req.json();

  if (!text || !sourceLang || !targetLang) {
    return NextResponse.json(
      { error: "Missing text, sourceLang, or targetLang" },
      { status: 400 }
    );
  }

  const res = await fetch(`${DEEPL_BASE}/v2/translate`, {
    method: "POST",
    headers: {
      Authorization: `DeepL-Auth-Key ${DEEPL_API_KEY}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      text: [text],
      source_lang: sourceLang,
      target_lang: targetLang,
    }),
  });

  if (!res.ok) {
    const err = await res.text();
    return NextResponse.json(
      { error: `DeepL API error: ${err}` },
      { status: res.status }
    );
  }

  const data = await res.json();
  const translatedText = data.translations?.[0]?.text ?? "";

  return NextResponse.json({ translatedText });
}
