import { NextResponse, type NextRequest } from "next/server";
import { log } from "@/lib/observability/logger";
import { checkRateLimit } from "@/lib/security/rate-limit";
import { readClientIp } from "@/lib/security/client-ip";

/**
 * Receives Content-Security-Policy violation reports from the browser
 * (both the legacy `report-uri` and modern `Report-To` formats) and
 * forwards them to the structured logger. Useful while CSP is in
 * Report-Only mode to spot policy gaps before flipping to enforce.
 *
 * The endpoint is rate-limited per IP because browsers can fire one
 * report per disallowed asset on a page and a misbehaving extension
 * can drown the logs. We accept POST only.
 */

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

const MAX_BODY_BYTES = 8 * 1024;

export async function POST(request: NextRequest) {
  const ip = readClientIp();
  const rl = await checkRateLimit({
    key: `csp-report:${ip}`,
    max: 30,
    windowMs: 60 * 1000,
  });
  if (!rl.ok) {
    return new NextResponse(null, { status: 429 });
  }

  let bodyText = "";
  try {
    bodyText = await request.text();
  } catch {
    return new NextResponse(null, { status: 400 });
  }
  if (!bodyText) {
    return new NextResponse(null, { status: 204 });
  }
  if (bodyText.length > MAX_BODY_BYTES) {
    bodyText = bodyText.slice(0, MAX_BODY_BYTES);
  }

  let parsed: unknown;
  try {
    parsed = JSON.parse(bodyText);
  } catch {
    log.warn("csp-report: invalid JSON body", { bytes: bodyText.length });
    return new NextResponse(null, { status: 400 });
  }

  log.warn("csp-report", {
    ip,
    user_agent: request.headers.get("user-agent") ?? null,
    report: parsed,
  });

  return new NextResponse(null, { status: 204 });
}
