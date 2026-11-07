import { describe, expect, it } from "vitest";
import {
  canAssign,
  checkPreferences,
  createHistory,
  householdOf,
  perform,
  redo,
  summariseCapacity,
  undo,
  type Assignment,
  type SeatingGuest,
  type SeatingTable,
} from "../seating";

const tables = (n: number, cap: number): SeatingTable[] =>
  Array.from({ length: n }, (_, i) => ({ id: `t${i + 1}`, label: `Table ${i + 1}`, capacity: cap }));

const guests = (n: number, status: SeatingGuest["rsvpStatus"] = "accepted", prefix = "g"): SeatingGuest[] =>
  Array.from({ length: n }, (_, i) => ({ id: `${prefix}${i + 1}`, householdId: `h-${prefix}${i + 1}`, rsvpStatus: status }));

describe("capacity summary", () => {
  it("brief example: 15 tables × 10 seats with 128 accepted guests seated leaves 22 seats", () => {
    const t = tables(15, 10);
    const g = guests(128);
    const a: Assignment[] = g.map((x, i) => ({ guestId: x.id, tableId: t[Math.floor(i / 10)].id }));
    const s = summariseCapacity(t, g, a);
    expect(s.totalCapacity).toBe(150);
    expect(s.occupied).toBe(128);
    expect(s.available).toBe(22);
    expect(s.unassignedAccepted).toBe(0);
  });

  it("declined guests never count as occupied and are flagged for review", () => {
    const t = tables(1, 10);
    const g = [...guests(3), { id: "d1", householdId: "hd", rsvpStatus: "declined" as const }];
    const a = g.map((x) => ({ guestId: x.id, tableId: "t1" }));
    const s = summariseCapacity(t, g, a);
    expect(s.occupied).toBe(3);
    expect(s.available).toBe(7);
    expect(s.needsReview).toBe(1);
  });

  it("pending guests already seated are shown as provisionally held", () => {
    const g = [...guests(2), ...guests(2, "pending", "p")];
    const s = summariseCapacity(tables(1, 10), g, g.map((x) => ({ guestId: x.id, tableId: "t1" })));
    expect(s.occupied).toBe(2);
    expect(s.provisionallyHeld).toBe(2);
    expect(s.available).toBe(6);
  });

  it("counts accepted guests who still need a seat", () => {
    const g = guests(5);
    const s = summariseCapacity(tables(1, 10), g, [{ guestId: "g1", tableId: "t1" }]);
    expect(s.unassignedAccepted).toBe(4);
  });
});

describe("canAssign", () => {
  const base = { tables: tables(2, 2), guests: guests(4), assignments: [] as Assignment[] };

  it("prevents over-capacity", () => {
    const state = { ...base, assignments: [{ guestId: "g1", tableId: "t1" }, { guestId: "g2", tableId: "t1" }] };
    const r = canAssign(["g3"], "t1", state);
    expect(r).toMatchObject({ ok: false, reason: "capacity" });
  });

  it("ignores declined guests when counting space", () => {
    const g = base.guests.map((x) => (x.id === "g1" ? { ...x, rsvpStatus: "declined" as const } : x));
    const state = { ...base, guests: g, assignments: [{ guestId: "g1", tableId: "t1" }, { guestId: "g2", tableId: "t1" }] };
    expect(canAssign(["g3"], "t1", state)).toEqual({ ok: true });
  });

  it("refuses declined guests and locked tables (into or out of)", () => {
    const g = base.guests.map((x) => (x.id === "g4" ? { ...x, rsvpStatus: "declined" as const } : x));
    expect(canAssign(["g4"], "t1", { ...base, guests: g })).toMatchObject({ reason: "declined" });
    const locked = base.tables.map((t) => (t.id === "t1" ? { ...t, isLocked: true } : t));
    expect(canAssign(["g1"], "t1", { ...base, tables: locked })).toMatchObject({ reason: "locked" });
    const seated = { ...base, tables: locked, assignments: [{ guestId: "g1", tableId: "t1" }] };
    expect(canAssign(["g1"], "t2", seated)).toMatchObject({ reason: "locked" });
  });

  it("moving within the same table doesn't double count", () => {
    const state = { ...base, assignments: [{ guestId: "g1", tableId: "t1", seatNumber: 1 }, { guestId: "g2", tableId: "t1", seatNumber: 2 }] };
    expect(canAssign(["g1"], "t1", state, 1)).toEqual({ ok: true });
    expect(canAssign(["g1"], "t1", state, 2)).toMatchObject({ ok: false, reason: "seat_taken" });
    expect(canAssign(["g1"], "t1", state)).toEqual({ ok: true });
  });

  it("places a household only if everyone fits", () => {
    const fam: SeatingGuest[] = ["a", "b", "c"].map((id) => ({ id, householdId: "fam", rsvpStatus: "accepted" }));
    const state = { tables: tables(1, 2), guests: fam, assignments: [] };
    expect(householdOf("a", fam)).toEqual(["a", "b", "c"]);
    const r = canAssign(householdOf("a", fam), "t1", state);
    expect(r).toMatchObject({ ok: false, reason: "capacity" });
    if (!r.ok) expect(r.message).toContain("needs 3");
  });
});

describe("preferences", () => {
  it("warns (never blocks) for apart/together and children away from parents", () => {
    const g: SeatingGuest[] = [
      { id: "mum", householdId: "h1", rsvpStatus: "accepted" },
      { id: "kid", householdId: "h1", rsvpStatus: "accepted", isChild: true },
      { id: "x", householdId: "h2", rsvpStatus: "accepted" },
      { id: "y", householdId: "h3", rsvpStatus: "accepted" },
    ];
    const a: Assignment[] = [
      { guestId: "mum", tableId: "t1" },
      { guestId: "kid", tableId: "t2" },
      { guestId: "x", tableId: "t1" },
      { guestId: "y", tableId: "t1" },
    ];
    const w = checkPreferences(g, a, [
      { kind: "apart", guestA: "x", guestB: "y" },
      { kind: "together", guestA: "mum", guestB: "kid" },
    ]);
    expect(w.map((x) => x.kind).sort()).toEqual(["apart", "child_without_adult", "together"]);
  });
});

describe("undo / redo", () => {
  it("restores the exact previous seating and queues compensating ops", () => {
    const h0 = createHistory({ tables: tables(2, 10), guests: guests(2), assignments: [{ guestId: "g1", tableId: "t1" }] });
    const h1 = perform(h0, [{ op: "assign", guest_id: "g1", table_id: "t2" }, { op: "assign", guest_id: "g2", table_id: "t2" }]);
    expect(h1.state.assignments).toEqual(
      expect.arrayContaining([expect.objectContaining({ guestId: "g1", tableId: "t2" })]),
    );
    const h2 = undo(h1);
    expect(h2.state.assignments).toEqual([{ guestId: "g1", tableId: "t1", seatNumber: null }]);
    expect(h2.pending.length).toBe(4); // 2 forward + 2 compensating, saved in order
    const h3 = redo(h2);
    expect(h3.state.assignments.map((a) => `${a.guestId}@${a.tableId}`).sort()).toEqual(["g1@t2", "g2@t2"]);
    expect(undo(createHistory(h0.state))).toEqual(createHistory(h0.state));
  });
});
