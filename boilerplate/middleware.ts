// Vercel Edge Middleware: runs on every request, ahead of the CDN cache, so it
// gates every path including static assets. No `matcher`/`config` export on
// purpose — narrowing it would leave some paths unprotected.
//
// Public by default: BASIC_AUTH_USER/BASIC_AUTH_PASS live only as env vars on
// the Vercel project, never in this repo or the built client bundle. Leaving
// them unset serves the site with no auth at all.

import { next } from "@vercel/functions";

const REALM = 'Basic realm="Documentation"';

function unauthorized(): Response {
  return new Response("Unauthorized", {
    status: 401,
    headers: { "WWW-Authenticate": REALM },
  });
}

/** Fixed-length comparison over the longer input; no early return on a mismatch. */
function timingSafeEqual(a: string, b: string): boolean {
  const length = Math.max(a.length, b.length);
  let mismatch = a.length === b.length ? 0 : 1;
  for (let i = 0; i < length; i++) {
    mismatch |= (a.charCodeAt(i) || 0) ^ (b.charCodeAt(i) || 0);
  }
  return mismatch === 0;
}

export default function middleware(request: Request): Response {
  const user = process.env.BASIC_AUTH_USER;
  const pass = process.env.BASIC_AUTH_PASS;
  if (!user || !pass) return next();

  const header = request.headers.get("authorization") ?? "";
  const [scheme, encoded] = header.split(" ");
  if (scheme !== "Basic" || !encoded) return unauthorized();

  let decoded: string;
  try {
    decoded = atob(encoded);
  } catch {
    return unauthorized();
  }

  const separator = decoded.indexOf(":");
  if (separator === -1) return unauthorized();
  const suppliedUser = decoded.slice(0, separator);
  const suppliedPass = decoded.slice(separator + 1);

  if (!timingSafeEqual(suppliedUser, user) || !timingSafeEqual(suppliedPass, pass)) {
    return unauthorized();
  }

  return next();
}
