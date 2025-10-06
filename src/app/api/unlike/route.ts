import { NextRequest, NextResponse } from "next/server";

const API_BASE = process.env.NEXT_PUBLIC_API_BASE ?? "https://cis.kku.ac.th/api/classroom";
const API_KEY = process.env.CLASSROOM_API_KEY;

type UnlikeSuccess = {
  data: unknown;
};

type UnlikeError = {
  error?: string;
  message?: string;
};

const parseBody = async (response: Response) => {
  const contentType = response.headers.get("content-type") ?? "";
  const text = await response.text();

  if (text.length === 0) return null;

  if (contentType.includes("application/json")) {
    return JSON.parse(text) as UnlikeSuccess | UnlikeError;
  }

  return { error: text } satisfies UnlikeError;
};

export async function POST(request: NextRequest) {
  if (!API_KEY) {
    return NextResponse.json(
      { error: "Server missing CLASSROOM_API_KEY environment variable" },
      { status: 500 }
    );
  }

  const authHeader = request.headers.get("authorization");
  if (!authHeader) {
    return NextResponse.json({ error: "Missing Authorization header" }, { status: 401 });
  }

  let payload: unknown;
  try {
    payload = await request.json();
  } catch (error) {
    return NextResponse.json({ error: "Invalid JSON body" }, { status: 400 });
  }

  try {
    const upstream = await fetch(`${API_BASE}/unlike`, {
      method: "POST",
      headers: {
        Authorization: authHeader,
        "Content-Type": "application/json",
        "x-api-key": API_KEY,
      },
      body: JSON.stringify(payload),
      cache: "no-store",
    });

    const data = await parseBody(upstream);

    if (!upstream.ok) {
      return NextResponse.json(
        data ?? { error: "Unable to unlike status" },
        { status: upstream.status || 500 }
      );
    }

    return NextResponse.json(data, { status: upstream.status });
  } catch (error) {
    const detail = error instanceof Error ? error.message : String(error);
    console.error("Failed to call unlike API", detail);
    return NextResponse.json(
      { error: "Unable to reach unlike service", detail },
      { status: 502 }
    );
  }
}
