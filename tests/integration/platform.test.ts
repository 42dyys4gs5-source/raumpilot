import { eq } from "drizzle-orm";
import { beforeEach, describe, expect, it } from "vitest";
import { createBooking } from "@/lib/booking/engine";
import { syncFeed } from "@/lib/calendar/sync";
import { db, schema } from "@/lib/db";
import { enqueue } from "@/lib/jobs/queue";
import { runDueJobs } from "@/lib/jobs/worker";
import { getOrgRoom, listOrgRooms } from "@/lib/rooms/service";
import { encrypt } from "@/lib/security/crypto";
import { rateLimit } from "@/lib/security/rate-limit";
import { consumeToken, issueToken } from "@/lib/auth/tokens";
import { createOrg, createRoom, customer, emailsTo, future, resetDb } from "../helpers";

beforeEach(resetDb);

const ics = (start: Date, end: Date) => {
  const f = (d: Date) => d.toISOString().replace(/[-:]/g, "").replace(/\.\d{3}/, "");
  return `BEGIN:VCALENDAR\r\nVERSION:2.0\r\nBEGIN:VEVENT\r\nUID:ext-1\r\nDTSTART:${f(start)}\r\nDTEND:${f(end)}\r\nSUMMARY:Intern\r\nEND:VEVENT\r\nEND:VCALENDAR\r\n`;
};

describe("tenant isolation", () => {
  it("rooms of other tenants are never returned", async () => {
    const { org: a } = await createOrg();
    const { org: b } = await createOrg();
    const roomB = await createRoom(b.id);
    expect(await getOrgRoom(a.id, roomB.id)).toBeNull();
    expect(await getOrgRoom(b.id, roomB.id)).not.toBeNull();
    expect((await listOrgRooms(a.id)).map((r) => r.id)).not.toContain(roomB.id);
  });
  it("customers are separate per tenant even with the same e-mail", async () => {
    const { org: a } = await createOrg();
    const { org: b } = await createOrg();
    const ra = await createRoom(a.id);
    const rb = await createRoom(b.id);
    for (const r of [ra, rb]) await createBooking({ roomId: r.id, start: future(3), end: new Date(future(3).getTime() + 3600_000), guests: 1, extras: [], customer, source: "online" });
    const cs = await db.select().from(schema.customers);
    expect(cs).toHaveLength(2);
    expect(new Set(cs.map((c) => c.orgId)).size).toBe(2);
  });
});

describe("calendar import", () => {
  it("blocks imported times and flags conflicts with existing bookings without cancelling them", async () => {
    const { org } = await createOrg();
    const room = await createRoom(org.id);
    const start = future(6);
    const { booking } = await createBooking({ roomId: room.id, start, end: new Date(start.getTime() + 2 * 3600_000), guests: 1, extras: [], customer, source: "online" });
    const [feed] = await db.insert(schema.calendarFeeds).values({ orgId: org.id, roomId: room.id, name: "Google", urlEnc: encrypt("https://example.com/cal.ics") }).returning();
    const r = await syncFeed(feed.id, async () => ics(new Date(start.getTime() + 3600_000), new Date(start.getTime() + 3 * 3600_000)));
    expect(r.events).toBe(1);
    expect(r.conflicts).toBe(1);
    const [b] = await db.select().from(schema.bookings).where(eq(schema.bookings.id, booking.id));
    expect(b.status).toBe("confirmed");
    expect(b.calendarConflict).toBe(true);
    // Imported block prevents new bookings in that time.
    const later = new Date(start.getTime() + 2 * 3600_000);
    await expect(createBooking({ roomId: room.id, start: later, end: new Date(later.getTime() + 3600_000), guests: 1, extras: [], customer, source: "online" })).rejects.toMatchObject({ code: "unavailable" });
    // Re-sync is idempotent (replaces blocks) and reports conflict only once.
    const r2 = await syncFeed(feed.id, async () => ics(new Date(start.getTime() + 3600_000), new Date(start.getTime() + 3 * 3600_000)));
    expect(r2.conflicts).toBe(0);
    expect(await db.select().from(schema.roomBlocks)).toHaveLength(1);
    await runDueJobs();
    expect((await emailsTo(org.contactEmail)).filter((m) => m.template === "landlord.calendar_conflict")).toHaveLength(1);
  });
  it("records fetch errors on the feed", async () => {
    const { org } = await createOrg();
    const room = await createRoom(org.id);
    const [feed] = await db.insert(schema.calendarFeeds).values({ orgId: org.id, roomId: room.id, name: "Kaputt", urlEnc: encrypt("https://example.com/x.ics") }).returning();
    const r = await syncFeed(feed.id, async () => { throw new Error("HTTP 404"); });
    expect(r.error).toBe("HTTP 404");
    const [f] = await db.select().from(schema.calendarFeeds).where(eq(schema.calendarFeeds.id, feed.id));
    expect(f.lastError).toBe("HTTP 404");
  });
});

describe("job queue", () => {
  it("deduplicates jobs by key", async () => {
    await enqueue(db, "booking.expire", {}, { dedupeKey: "k1" });
    await enqueue(db, "booking.expire", {}, { dedupeKey: "k1" });
    expect(await db.select().from(schema.jobs)).toHaveLength(1);
  });
  it("retries failing jobs with backoff and marks them failed after max attempts", async () => {
    await enqueue(db, "welcome.step", { userId: "not-a-uuid", step: 0 }, { maxAttempts: 2 });
    let s = await runDueJobs();
    expect(s.retried).toBe(1);
    let [j] = await db.select().from(schema.jobs);
    expect(j.status).toBe("pending");
    expect(j.runAt.getTime()).toBeGreaterThan(Date.now());
    await db.update(schema.jobs).set({ runAt: new Date(Date.now() - 1000) });
    s = await runDueJobs();
    expect(s.failed).toBe(1);
    [j] = await db.select().from(schema.jobs);
    expect(j.status).toBe("failed");
    expect((await db.select().from(schema.errorLog)).length).toBeGreaterThan(0);
  });
});

describe("auth tokens & rate limiting", () => {
  it("tokens are single-use and invalidated on reissue", async () => {
    const { user } = await createOrg();
    const t1 = await issueToken(user.id, "password_reset");
    const t2 = await issueToken(user.id, "password_reset");
    expect(await consumeToken(t1, "password_reset")).toBeNull();
    expect(await consumeToken(t2, "email_verify")).toBeNull();
    expect(await consumeToken(t2, "password_reset")).toBe(user.id);
    expect(await consumeToken(t2, "password_reset")).toBeNull();
  });
  it("rate limiter blocks after the limit", async () => {
    const results = [];
    for (let i = 0; i < 5; i++) results.push(await rateLimit("test-key", 3, 60));
    expect(results).toEqual([true, true, true, false, false]);
  });
});
