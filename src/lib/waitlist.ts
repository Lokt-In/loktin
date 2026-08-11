// Waitlist submission → a Google Apps Script web app that appends the email to a
// Google Sheet. The URL + optional token are public (they ship in the client
// bundle); the endpoint only ever *appends*, never reads, so the collected list
// is never exposed. See planning notes for the Apps Script + deploy steps.
const WAITLIST_URL = import.meta.env.PUBLIC_WAITLIST_URL as string | undefined;
const WAITLIST_TOKEN =
  (import.meta.env.PUBLIC_WAITLIST_TOKEN as string | undefined) ?? "";

const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

export function isValidEmail(email: string): boolean {
  return EMAIL_RE.test(email.trim());
}

/**
 * Append `email` to the waitlist sheet.
 *
 * Apps Script web apps don't return CORS headers, so this is a deliberate
 * fire-and-forget: `mode: "no-cors"` lets the POST land but leaves the response
 * opaque. A resolved promise therefore means "sent", not "server-confirmed" —
 * which is the right trade-off for a waitlist (the row still appears in the
 * sheet). Only an outright network failure rejects.
 */
export async function joinWaitlist(email: string): Promise<void> {
  if (!WAITLIST_URL) {
    throw new Error("Waitlist isn’t configured yet.");
  }
  const body = new URLSearchParams({
    email: email.trim(),
    token: WAITLIST_TOKEN,
  });
  await fetch(WAITLIST_URL, {
    method: "POST",
    mode: "no-cors",
    // Form-encoded keeps it a CORS "simple request" (no preflight) and lands in
    // the Apps Script `e.parameter`.
    headers: { "Content-Type": "application/x-www-form-urlencoded" },
    body: body.toString(),
  });
}
