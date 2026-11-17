// Job Tracker calendar feed (Supabase Edge Function named "calendar").
// Turns your appointments and reminders into a calendar that Apple Calendar can subscribe to.
// Paste this whole file into Supabase → Edge Functions → Deploy a new function → Via Editor.

const PROJECT_URL = Deno.env.get("SUPABASE_URL") || "https://zfdtnprrjhewdvepbovo.supabase.co";
// The public (publishable) key. The private calendar link token is what decides whose data comes back.
const PUBLIC_KEY = Deno.env.get("SUPABASE_ANON_KEY") || "sb_publishable_gRPjEWbBBObRIwLcyvhvrw_Jo41UBPC";

const EVENT_LABELS: Record<string, string> = {
  sales: "Sales call", measure: "Final measure", install: "Install", meeting: "Site visit",
  other: "Appointment", prewire: "Pre-wire / drill", service: "Service / repair",
};

const pad = (n: number) => String(n).padStart(2, "0");
const ymd = (d: Date) => `${d.getUTCFullYear()}-${pad(d.getUTCMonth() + 1)}-${pad(d.getUTCDate())}`;
const addDays = (s: string, n: number) => { const [y, m, d] = s.split("-").map(Number); return ymd(new Date(Date.UTC(y, m - 1, d + n))); };
const icsDate = (s: string) => s.replace(/-/g, "");
const icsDateTime = (s: string, t: string) => `${icsDate(s)}T${t.replace(":", "").padEnd(4, "0")}00`;
const addHour = (t: string) => { const [h, m] = t.split(":").map(Number); const x = Math.min(h + 1, 23); return `${pad(x)}:${pad(m || 0)}`; };
const esc = (s: unknown) => String(s ?? "").replace(/\\/g, "\\\\").replace(/;/g, "\\;").replace(/,/g, "\\,").replace(/\r?\n/g, "\\n");

// Calendar files want lines of at most 75 bytes; longer ones continue on the next line after a space.
function fold(line: string): string {
  const bytes = new TextEncoder().encode(line);
  if (bytes.length <= 75) return line;
  const out: string[] = [];
  let cur = "", curLen = 0;
  for (const ch of line) {
    const n = new TextEncoder().encode(ch).length;
    if (curLen + n > (out.length ? 74 : 75)) { out.push(cur); cur = ""; curLen = 0; }
    cur += ch; curLen += n;
  }
  out.push(cur);
  return out.join("\r\n ");
}

type Row = { coll: string; id: string; body: Record<string, any> };

export function buildICS(rows: Row[], today: string): string {
  const jobs = new Map<string, any>();
  rows.filter((r) => r.coll === "jobs").forEach((r) => jobs.set(r.id, r.body));
  const since = addDays(today, -60);
  const stamp = new Date().toISOString().replace(/[-:]/g, "").replace(/\.\d+Z$/, "Z");
  const lines: string[] = [
    "BEGIN:VCALENDAR", "VERSION:2.0", "PRODID:-//Job Tracker//EN", "CALSCALE:GREGORIAN", "METHOD:PUBLISH",
    "X-WR-CALNAME:Job Tracker", "X-WR-CALDESC:Appointments and reminders from Job Tracker",
    "REFRESH-INTERVAL;VALUE=DURATION:PT15M", "X-PUBLISHED-TTL:PT15M",
  ];
  const peopleLine = (j: any) => (j?.people || []).filter((p: any) => p?.name).map((p: any) => [p.name, p.role, p.phone].filter(Boolean).join(", ")).join("\n");

  for (const r of rows.filter((x) => x.coll === "events")) {
    const e = r.body || {};
    if (!e.date || e.date < since) continue;
    const j = e.jobId ? jobs.get(e.jobId) : null;
    const days = Math.max(1, Number(e.days) || 1);
    const label = EVENT_LABELS[e.type] || "Appointment";
    lines.push("BEGIN:VEVENT", `UID:${r.id}@job-tracker`, `DTSTAMP:${stamp}`);
    if (e.start) {
      lines.push(`DTSTART:${icsDateTime(e.date, e.start)}`, `DTEND:${icsDateTime(e.date, e.end && e.end > e.start ? e.end : addHour(e.start))}`);
      if (days > 1) lines.push(`RRULE:FREQ=DAILY;COUNT=${days}`);
    } else {
      lines.push(`DTSTART;VALUE=DATE:${icsDate(e.date)}`, `DTEND;VALUE=DATE:${icsDate(addDays(e.date, days))}`);
    }
    lines.push(`SUMMARY:${esc(j ? `${label} · ${j.name}` : e.title || label)}`);
    const where = e.location || j?.address;
    if (where) lines.push(`LOCATION:${esc(where)}`);
    const desc = [e.notes, peopleLine(j), e.summary ? `How it went: ${e.summary}` : ""].filter(Boolean).join("\n\n");
    if (desc) lines.push(`DESCRIPTION:${esc(desc)}`);
    if (e.done) lines.push("STATUS:CONFIRMED");
    lines.push("END:VEVENT");
  }

  for (const r of rows.filter((x) => x.coll === "tasks")) {
    const t = r.body || {};
    if (!t.due || t.done || t.due < since) continue;
    const j = t.jobId ? jobs.get(t.jobId) : null;
    lines.push("BEGIN:VEVENT", `UID:${r.id}@job-tracker`, `DTSTAMP:${stamp}`);
    if (t.time) lines.push(`DTSTART:${icsDateTime(t.due, t.time)}`, `DTEND:${icsDateTime(t.due, addHour(t.time))}`);
    else lines.push(`DTSTART;VALUE=DATE:${icsDate(t.due)}`, `DTEND;VALUE=DATE:${icsDate(addDays(t.due, 1))}`);
    lines.push(`SUMMARY:${esc(`☐ ${t.title}${j ? ` · ${j.name}` : ""}`)}`);
    const desc = [t.notes, peopleLine(j)].filter(Boolean).join("\n\n");
    if (desc) lines.push(`DESCRIPTION:${esc(desc)}`);
    lines.push("TRANSP:TRANSPARENT", "END:VEVENT");
  }

  lines.push("END:VCALENDAR");
  return lines.map(fold).join("\r\n") + "\r\n";
}

Deno.serve(async (req: Request) => {
  const token = new URL(req.url).searchParams.get("token") || "";
  if (token.length < 32) return new Response("Not found", { status: 404 });
  const res = await fetch(`${PROJECT_URL}/rest/v1/rpc/calendar_feed`, {
    method: "POST",
    headers: { apikey: PUBLIC_KEY, "content-type": "application/json" },
    body: JSON.stringify({ p_token: token }),
  });
  if (!res.ok) return new Response("Calendar unavailable", { status: 502 });
  // A wrong or deleted link simply gets an empty calendar; nothing about other links is revealed.
  const rows = (await res.json()) as Row[];
  // Floating times: the calendar shows them in the phone's own time zone, the same way the app does.
  const now = new Date(Date.now() - 6 * 3600 * 1000); // close enough to "today" in US time zones
  const ics = buildICS(rows, ymd(now));
  return new Response(ics, { headers: { "content-type": "text/calendar; charset=utf-8", "cache-control": "no-store" } });
});
