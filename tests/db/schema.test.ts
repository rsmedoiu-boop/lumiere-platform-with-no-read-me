/**
 * Database integration tests against a real local Postgres.
 * Proves the rules the business depends on are enforced by the database
 * itself — not just by the web UI. Run with: npm run test:db
 *
 * Requires DATABASE_URL (superuser on a throwaway database). The suite
 * rebuilds the schema from supabase/migrations on every run.
 */
import { readFileSync, readdirSync } from "node:fs";
import { join } from "node:path";
import { Client } from "pg";
import { afterAll, beforeAll, beforeEach, describe, expect, it } from "vitest";

const url = process.env.DATABASE_URL;
const root = join(__dirname, "..", "..", "supabase");
const read = (p: string) => readFileSync(join(root, p), "utf8");

/** Owner connection: builds the schema and fixtures that need superuser. */
let admin: Client;
/** API-like connection: logs in as `authenticator` (as Supabase's API does), then switches role. */
let db: Client;

/** Run `fn` as a signed-in customer, with RLS applied, inside a rolled-back transaction. */
async function asUser<T>(userId: string, fn: (c: Client) => Promise<T>): Promise<T> {
  await db.query("begin");
  try {
    await db.query("set local role authenticated");
    await db.query("select set_config('request.jwt.claim.sub', $1, true), set_config('request.jwt.claim.role', 'authenticated', true)", [userId]);
    return await fn(db);
  } finally {
    await db.query("rollback");
  }
}

/** Like asUser but commits (used to build fixtures through the real policies). */
async function asUserCommit<T>(userId: string, fn: (c: Client) => Promise<T>): Promise<T> {
  await db.query("begin");
  try {
    await db.query("set local role authenticated");
    await db.query("select set_config('request.jwt.claim.sub', $1, true)", [userId]);
    const r = await fn(db);
    await db.query("commit");
    return r;
  } catch (e) {
    await db.query("rollback");
    throw e;
  }
}

/** Expect a statement to fail, without aborting the surrounding transaction. */
async function fails(sql: string, params: unknown[], pattern: RegExp) {
  await db.query("savepoint expect_fail");
  await expect(db.query(sql, params)).rejects.toThrow(pattern);
  await db.query("rollback to savepoint expect_fail");
}

const one = async <T = Record<string, unknown>>(sql: string, params: unknown[] = []) =>
  (await db.query(sql, params)).rows[0] as T;

async function createUser(email: string): Promise<string> {
  const r = await admin.query("insert into auth.users (email) values ($1) returning id", [email]);
  return r.rows[0].id;
}

interface Fixture {
  alice: string;
  bob: string;
  eventId: string;
  planId: string;
  tableIds: string[];
  guestIds: string[];
}

/** Alice's wedding: 15 tables × 10 seats, 128 accepted guests seated, 10 pending, 2 declined. */
async function buildWedding(): Promise<Fixture> {
  const alice = await createUser(`alice-${Math.random()}@test.dev`);
  const bob = await createUser(`bob-${Math.random()}@test.dev`);
  const cat = (await admin.query("select id from categories where slug = 'weddings'")).rows[0] as { id: string };

  return asUserCommit(alice, async () => {
    const slug = `sarah-and-james-${Math.floor(Math.random() * 1e9)}`;
    const ev = await one<{ id: string }>(
      "insert into events (owner_id, category_id, slug, title, host_names) values ($1, $2, $3, 'Sarah & James', array['Sarah','James']) returning id",
      [alice, cat.id, slug],
    );
    const plan = await one<{ id: string }>("insert into seating_plans (event_id) values ($1) returning id", [ev.id]);
    const tables = await db.query(
      "insert into venue_tables (event_id, plan_id, label, capacity) select $1, $2, 'Table ' || n, 10 from generate_series(1, 15) n returning id",
      [ev.id, plan.id],
    );
    const households = await db.query(
      "insert into households (event_id, name) select $1, 'Household ' || n from generate_series(1, 140) n returning id",
      [ev.id],
    );
    const guestIds: string[] = [];
    for (let i = 0; i < 140; i++) {
      const g = await one<{ id: string }>(
        "insert into guests (event_id, household_id, first_name) values ($1, $2, $3) returning id",
        [ev.id, households.rows[i].id, `Guest ${i + 1}`],
      );
      guestIds.push(g.id);
    }
    // 128 accept (+ seated), 10 stay pending, 2 decline.
    for (let i = 0; i < 128; i++) {
      await db.query("insert into rsvp_responses (event_id, guest_id, status) values ($1, $2, 'accepted')", [ev.id, guestIds[i]]);
    }
    for (let i = 138; i < 140; i++) {
      await db.query("insert into rsvp_responses (event_id, guest_id, status) values ($1, $2, 'declined')", [ev.id, guestIds[i]]);
    }
    const ops = guestIds.slice(0, 128).map((gid, i) => ({ op: "assign", guest_id: gid, table_id: tables.rows[Math.floor(i / 10)].id }));
    await db.query("select apply_seating_changes($1, 1, $2::jsonb)", [plan.id, JSON.stringify(ops)]);
    return { alice, bob, eventId: ev.id, planId: plan.id, tableIds: tables.rows.map((r) => r.id), guestIds };
  });
}

const run = url ? describe : describe.skip;

run("database rules", () => {
  let f: Fixture;

  beforeAll(async () => {
    admin = new Client({ connectionString: url });
    await admin.connect();
    await admin.query(
      "drop schema if exists public cascade; drop schema if exists auth cascade; drop schema if exists storage cascade; create schema public;",
    );
    await admin.query(read("tests/local_supabase_shim.sql"));
    await admin.query(read("tests/local_grants.sql"));
    for (const file of readdirSync(join(root, "migrations")).sort()) {
      await admin.query(read(join("migrations", file)));
    }
    await admin.query(read("seed.sql"));
    await admin.query(`do $$ begin
      if not exists (select 1 from pg_roles where rolname = 'authenticator') then
        create role authenticator login noinherit password 'authenticator';
      end if; end $$;
      grant anon, authenticated, service_role to authenticator;`);
    const apiUrl = new URL(url!);
    apiUrl.username = "authenticator";
    apiUrl.password = "authenticator";
    db = new Client({ connectionString: apiUrl.toString() });
    await db.connect();
  });

  beforeEach(async () => {
    f = await buildWedding();
  });

  afterAll(async () => {
    await db?.end();
    await admin?.end();
  });

  it("creates 28 tables, all with row level security on", async () => {
    const r = (await admin.query(
      `select count(*) total, count(*) filter (where c.relrowsecurity) rls
         from pg_class c join pg_namespace n on n.oid = c.relnamespace
        where n.nspname = 'public' and c.relkind = 'r'`,
    )).rows[0] as { total: string; rls: string };
    expect(Number(r.total)).toBe(28); // 27 core + rate_limits
    expect(Number(r.rls)).toBe(28);
  });

  it("reports the brief's example: 150 capacity, 128 confirmed, 22 available", async () => {
    const s = await asUser(f.alice, () => one("select * from event_stats($1)", [f.eventId]));
    expect(s).toMatchObject({
      invited: 140, accepted: 128, declined: 2, pending: 10,
      total_capacity: 150, occupied: 128, available: 22, unassigned_accepted: 0, needs_review: 0,
    });
  });

  it("isolates customers: Bob can't see or change Alice's wedding", async () => {
    await asUser(f.bob, async () => {
      expect((await db.query("select * from events where id = $1", [f.eventId])).rowCount).toBe(0);
      expect((await db.query("select * from guests where event_id = $1", [f.eventId])).rowCount).toBe(0);
      expect((await db.query("update guests set first_name = 'hacked' where event_id = $1", [f.eventId])).rowCount).toBe(0);
      await fails("insert into guest_groups (event_id, name) values ($1, 'Intruders')", [f.eventId], /row-level security/);
    });
    await asUser(f.alice, async () => {
      expect((await db.query("select * from guests where event_id = $1", [f.eventId])).rowCount).toBe(140);
    });
  });

  it("anonymous visitors see the public catalogue but no customer data", async () => {
    await db.query("begin");
    await db.query("set local role anon");
    const prices = await db.query("select p.slug, pr.unit_amount from products p join prices pr on pr.product_id = p.id");
    expect(prices.rows.find((r) => r.slug === "complete-experience")?.unit_amount).toBe(11999);
    expect((await db.query("select * from events")).rowCount).toBe(0);
    expect((await db.query("select * from guests")).rowCount).toBe(0);
    expect((await db.query("select * from promo_codes")).rowCount).toBe(0);
    await db.query("rollback");
  });

  it("customers cannot promote themselves to admin", async () => {
    await asUser(f.alice, async () => {
      await fails("update profiles set role = 'admin' where id = $1", [f.alice], /Only administrators/);
    });
  });

  it("customers cannot mark their own orders as paid or grant themselves features", async () => {
    await asUser(f.alice, async () => {
      await fails("insert into orders (customer_id, subtotal_amount, total_amount, status) values ($1, 0, 0, 'paid')", [f.alice], /row-level security/);
      await fails("insert into entitlements (event_id, feature) values ($1, 'seating')", [f.eventId], /row-level security/);
    });
  });

  it("prevents over-capacity assignments", async () => {
    // Table 13 holds guests 121-128 (8 people). Two more pending guests fit; a third does not.
    await asUser(f.alice, async () => {
      const t13 = f.tableIds[12];
      await db.query(
        "select apply_seating_changes($1, 2, $2::jsonb)",
        [f.planId, JSON.stringify([129, 130].map((n) => ({ op: "assign", guest_id: f.guestIds[n - 1], table_id: t13 })))],
      );
      await fails("select apply_seating_changes($1, 3, $2::jsonb)", [
          f.planId,
          JSON.stringify([{ op: "assign", guest_id: f.guestIds[130], table_id: t13 }]),
        ], /is full \(10 of 10 seats\)/);
    });
  });

  it("an RSVP change flags the seat for review and never deletes it", async () => {
    await asUser(f.alice, async () => {
      await db.query("insert into rsvp_responses (event_id, guest_id, status, submitted_by) values ($1, $2, 'declined', 'host')", [
        f.eventId, f.guestIds[0],
      ]);
      const a = await one("select needs_review, review_reason from guest_assignments where guest_id = $1", [f.guestIds[0]]);
      expect(a).toMatchObject({ needs_review: true, review_reason: "RSVP changed from accepted to declined" });
      const s = await one("select occupied, available, needs_review from event_stats($1)", [f.eventId]);
      expect(s).toMatchObject({ occupied: 127, available: 23, needs_review: 1 });
      // Changing their mind again clears the flag.
      await db.query("insert into rsvp_responses (event_id, guest_id, status) values ($1, $2, 'accepted')", [f.eventId, f.guestIds[0]]);
      expect((await one("select needs_review from guest_assignments where guest_id = $1", [f.guestIds[0]])).needs_review).toBe(false);
    });
  });

  it("declined guests can't be seated", async () => {
    await asUser(f.alice, async () => {
      await fails("select apply_seating_changes($1, 2, $2::jsonb)", [
          f.planId,
          JSON.stringify([{ op: "assign", guest_id: f.guestIds[139], table_id: f.tableIds[14] }]),
        ], /declined/);
    });
  });

  it("locked tables refuse changes in and out, but the event can still be deleted", async () => {
    await asUser(f.alice, async () => {
      await db.query("select apply_seating_changes($1, 2, $2::jsonb)", [
        f.planId,
        JSON.stringify([{ op: "lock", table_id: f.tableIds[0], locked: true }]),
      ]);
      await fails("select apply_seating_changes($1, 3, $2::jsonb)", [
          f.planId, JSON.stringify([{ op: "unassign", guest_id: f.guestIds[0] }]),
        ], /locked/);
      await fails("select apply_seating_changes($1, 3, $2::jsonb)", [
          f.planId, JSON.stringify([{ op: "assign", guest_id: f.guestIds[130], table_id: f.tableIds[0] }]),
        ], /locked/);
      await fails("delete from venue_tables where id = $1", [f.tableIds[0]], /locked/);
      // Full event deletion (e.g. retention clean-up) still cascades.
      expect((await db.query("delete from events where id = $1", [f.eventId])).rowCount).toBe(1);
    });
  });

  it("a seated guest can't be silently deleted", async () => {
    await asUser(f.alice, async () => {
      await fails("delete from guests where id = $1", [f.guestIds[0]], /remove them from their table first/);
      // …including indirectly, by deleting their household.
      await fails("delete from households where id = (select household_id from guests where id = $1)", [f.guestIds[0]], /remove them from their table first/);
      await db.query("select apply_seating_changes($1, 2, $2::jsonb)", [
        f.planId, JSON.stringify([{ op: "unassign", guest_id: f.guestIds[0] }]),
      ]);
      expect((await db.query("delete from guests where id = $1", [f.guestIds[0]])).rowCount).toBe(1);
    });
  });

  it("detects concurrent edits with the plan version", async () => {
    await asUser(f.alice, async () => {
      await fails("select apply_seating_changes($1, 1, '[]'::jsonb)", [f.planId], /changed elsewhere \(now version 2\)/);
    });
  });

  it("guests and tables from different events can never be mixed", async () => {
    const other = await buildWedding();
    // Even with RLS bypassed (superuser), the composite keys refuse it.
    await expect(
      admin.query("insert into guest_assignments (event_id, plan_id, guest_id, table_id) values ($1, $2, $3, $4)", [
        f.eventId, f.planId, other.guestIds[131], f.tableIds[14],
      ]),
    ).rejects.toThrow(/foreign key/);
  });

  it("seat numbers follow table capacity and a seat holds one guest", async () => {
    await asUser(f.alice, async () => {
      const seats = await one<{ n: string }>("select count(*) n from table_seats where table_id = $1", [f.tableIds[14]]);
      expect(Number(seats.n)).toBe(10);
      await db.query("select apply_seating_changes($1, 2, $2::jsonb)", [
        f.planId,
        JSON.stringify([
          { op: "assign", guest_id: f.guestIds[128], table_id: f.tableIds[14], seat_number: 3 },
        ]),
      ]);
      await fails("select apply_seating_changes($1, 3, $2::jsonb)", [
          f.planId, JSON.stringify([{ op: "assign", guest_id: f.guestIds[129], table_id: f.tableIds[14], seat_number: 3 }]),
        ], /duplicate key/);
      // Can't shrink a table below the guests sitting at it.
      await fails("update venue_tables set capacity = 5 where id = $1", [f.tableIds[0]], /capacity cannot be 5/);
    });
  });

  // ---------------------------------------------------------------- Milestone 2

  it("storage: owners use their event folder; nobody else can read or write it", async () => {
    const path = `${f.eventId}/photo.jpg`;
    await asUser(f.alice, async () => {
      await db.query("insert into storage.objects (bucket_id, name) values ('event-media', $1)", [path]);
      expect((await db.query("select * from storage.objects where name = $1", [path])).rowCount).toBe(1);
      // Exports are written by the server only.
      await fails("insert into storage.objects (bucket_id, name) values ('exports', $1)", [`${f.eventId}/v1/chart.pdf`], /row-level security/);
      // A path that doesn't start with an event id is refused, not an error.
      await fails("insert into storage.objects (bucket_id, name) values ('event-media', 'not-a-uuid/x.jpg')", [], /row-level security/);
    });
    await admin.query("insert into storage.objects (bucket_id, name) values ('event-media', $1)", [path]);
    await asUser(f.bob, async () => {
      expect((await db.query("select * from storage.objects where name = $1", [path])).rowCount).toBe(0);
      await fails("insert into storage.objects (bucket_id, name) values ('event-media', $1)", [`${f.eventId}/evil.jpg`], /row-level security/);
    });
    const buckets = (await admin.query("select id, public from storage.buckets order by id")).rows;
    expect(buckets).toEqual([{ id: "event-media", public: false }, { id: "exports", public: false }]);
  });

  it("rate limiting: only the server can call it, and it blocks after the limit", async () => {
    await asUser(f.alice, async () => {
      await fails("select * from hit_rate_limit('login:x', 3, 60)", [], /permission denied/);
    });
    await db.query("begin");
    await db.query("set local role service_role");
    const key = `login:${Math.random()}`;
    const results = [];
    for (let i = 0; i < 4; i++) results.push((await db.query("select * from hit_rate_limit($1, 3, 60)", [key])).rows[0]);
    await db.query("rollback");
    expect(results.map((r) => r.allowed)).toEqual([true, true, true, false]);
    expect(results[2].remaining).toBe(0);
    expect(results[3].retry_after_seconds).toBeGreaterThan(0);
  });

  it("export my data: complete for the owner, empty for anyone else", async () => {
    const mine = await asUser(f.alice, () => one<{ d: any }>("select export_my_data() d"));
    expect(mine.d.profile.id).toBe(f.alice);
    expect(mine.d.events).toHaveLength(1);
    expect(mine.d.events[0].guests).toHaveLength(140);
    expect(mine.d.events[0].seat_assignments).toHaveLength(128);
    const bobs = await asUser(f.bob, () => one<{ d: any }>("select export_my_data() d"));
    expect(bobs.d.events).toEqual([]);
  });

  it("account deletion: 14-day grace, then everything goes except detached order records", async () => {
    await admin.query(
      "insert into orders (customer_id, event_id, status, subtotal_amount, total_amount) values ($1, $2, 'paid', 11999, 11999)",
      [f.alice, f.eventId],
    );
    await admin.query("update profiles set full_name = 'Alice Example' where id = $1", [f.alice]);
    const until = await asUserCommit(f.alice, () => one<{ d: Date }>("select request_account_deletion() d"));
    const days = (new Date(until.d).getTime() - Date.now()) / 86_400_000;
    expect(Math.round(days)).toBe(14);

    // Inside the grace period nothing is removed.
    expect((await admin.query("select purge_deleted_accounts() n")).rows[0]).toEqual({ n: 0 });
    // Simulate the 14 days passing.
    await admin.query("update profiles set deleted_requested_at = now() - interval '15 days' where id = $1", [f.alice]);
    const purged = (await admin.query("select purge_deleted_accounts() n")).rows[0].n;
    expect(purged).toBeGreaterThanOrEqual(1);
    expect((await admin.query("select 1 from auth.users where id = $1", [f.alice])).rowCount).toBe(0);
    expect((await admin.query("select 1 from events where id = $1", [f.eventId])).rowCount).toBe(0);
    expect((await admin.query("select 1 from guests where event_id = $1", [f.eventId])).rowCount).toBe(0);
    const order = (await admin.query("select customer_id, billing_name, total_amount from orders where event_id is null and billing_name = 'Alice Example'")).rows[0];
    expect(order).toEqual({ customer_id: null, billing_name: "Alice Example", total_amount: 11999 });
  });

  it("roles: customers can't grant roles; the owner can bootstrap an admin, who then sees all events", async () => {
    const email = (await admin.query("select email from auth.users where id = $1", [f.bob])).rows[0].email;
    await asUser(f.alice, async () => {
      await fails("select set_user_role($1, 'admin')", [email], /Only administrators/);
    });
    await admin.query("select set_user_role($1, 'admin')", [email]);
    await asUser(f.bob, async () => {
      expect((await db.query("select 1 from events where id = $1", [f.eventId])).rowCount).toBe(1);
      // Staff read access is not write access.
      expect((await db.query("update events set title = 'x' where id = $1", [f.eventId])).rowCount).toBe(0);
    });
  });
});
