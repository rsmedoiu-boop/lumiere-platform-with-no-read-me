/**
 * Smart Seating Planner — pure business rules.
 *
 * No React, no Next.js, no database client: the same module powers the web
 * planner, the dashboard statistics, the export builder and (later) a mobile
 * app or AI suggestion engine. The database enforces the same rules again
 * (see supabase/migrations), so the browser gives instant feedback and the
 * server is the final authority.
 */

export type RsvpStatus = "pending" | "accepted" | "declined";

export interface SeatingGuest {
  id: string;
  householdId: string;
  groupId?: string | null;
  rsvpStatus: RsvpStatus;
  isChild?: boolean;
  plusOneOf?: string | null;
}

export interface SeatingTable {
  id: string;
  label: string;
  capacity: number;
  isLocked?: boolean;
}

export interface Assignment {
  guestId: string;
  tableId: string;
  seatNumber?: number | null;
  needsReview?: boolean;
}

export interface SeatingPreference {
  kind: "together" | "apart";
  guestA?: string;
  guestB?: string;
  groupA?: string;
  groupB?: string;
}

/** Does this guest occupy a seat? Declined guests never do. */
export const occupiesSeat = (g: Pick<SeatingGuest, "rsvpStatus">) => g.rsvpStatus !== "declined";

export interface CapacitySummary {
  totalCapacity: number;
  /** Seated guests who have accepted. */
  occupied: number;
  /** Seated guests still pending — seats held provisionally. */
  provisionallyHeld: number;
  /** Capacity minus every seat taken by a non-declined guest. */
  available: number;
  acceptedGuests: number;
  unassignedAccepted: number;
  /** Assignments that need the couple's attention (e.g. guest declined). */
  needsReview: number;
}

export function summariseCapacity(
  tables: SeatingTable[],
  guests: SeatingGuest[],
  assignments: Assignment[],
): CapacitySummary {
  const guestById = new Map(guests.map((g) => [g.id, g]));
  const seated = new Set(assignments.map((a) => a.guestId));
  const totalCapacity = tables.reduce((sum, t) => sum + t.capacity, 0);

  let occupied = 0;
  let provisionallyHeld = 0;
  let needsReview = 0;
  for (const a of assignments) {
    const g = guestById.get(a.guestId);
    if (!g) continue;
    if (g.rsvpStatus === "accepted") occupied++;
    if (g.rsvpStatus === "pending") provisionallyHeld++;
    if (a.needsReview || g.rsvpStatus === "declined") needsReview++;
  }
  const acceptedGuests = guests.filter((g) => g.rsvpStatus === "accepted").length;
  const unassignedAccepted = guests.filter((g) => g.rsvpStatus === "accepted" && !seated.has(g.id)).length;

  return {
    totalCapacity,
    occupied,
    provisionallyHeld,
    available: Math.max(totalCapacity - occupied - provisionallyHeld, 0),
    acceptedGuests,
    unassignedAccepted,
    needsReview,
  };
}

export function tableOccupancy(table: SeatingTable, guests: SeatingGuest[], assignments: Assignment[]) {
  const guestById = new Map(guests.map((g) => [g.id, g]));
  const used = assignments.filter((a) => {
    const g = guestById.get(a.guestId);
    return a.tableId === table.id && g && occupiesSeat(g);
  }).length;
  return { used, free: Math.max(table.capacity - used, 0), full: used >= table.capacity };
}

export type AssignRefusal =
  | { ok: false; reason: "locked"; message: string }
  | { ok: false; reason: "declined"; message: string }
  | { ok: false; reason: "capacity"; message: string }
  | { ok: false; reason: "seat_taken"; message: string }
  | { ok: false; reason: "unknown"; message: string };
export type AssignCheck = { ok: true } | AssignRefusal;

/**
 * Can these guests (one, or a whole household) be placed at `tableId`?
 * Mirrors public.check_guest_assignment() in the database.
 */
export function canAssign(
  guestIds: string[],
  tableId: string,
  state: { tables: SeatingTable[]; guests: SeatingGuest[]; assignments: Assignment[] },
  seatNumber?: number | null,
): AssignCheck {
  const table = state.tables.find((t) => t.id === tableId);
  if (!table) return { ok: false, reason: "unknown", message: "Table not found" };
  if (table.isLocked) return { ok: false, reason: "locked", message: `${table.label} is locked` };

  const guestById = new Map(state.guests.map((g) => [g.id, g]));
  for (const id of guestIds) {
    const g = guestById.get(id);
    if (!g) return { ok: false, reason: "unknown", message: "Guest not found" };
    if (g.rsvpStatus === "declined") {
      return { ok: false, reason: "declined", message: "A guest who has declined can't be seated" };
    }
    const current = state.assignments.find((a) => a.guestId === id);
    if (current && current.tableId !== tableId) {
      const from = state.tables.find((t) => t.id === current.tableId);
      if (from?.isLocked) return { ok: false, reason: "locked", message: `${from.label} is locked` };
    }
  }

  if (seatNumber != null) {
    if (seatNumber < 1 || seatNumber > table.capacity) {
      return { ok: false, reason: "unknown", message: `Seat ${seatNumber} doesn't exist` };
    }
    const taken = state.assignments.find(
      (a) => a.tableId === tableId && a.seatNumber === seatNumber && !guestIds.includes(a.guestId),
    );
    if (taken) return { ok: false, reason: "seat_taken", message: `Seat ${seatNumber} is taken` };
  }

  const movingIn = new Set(guestIds);
  const staying = state.assignments.filter((a) => {
    const g = guestById.get(a.guestId);
    return a.tableId === tableId && !movingIn.has(a.guestId) && g && occupiesSeat(g);
  }).length;
  if (staying + guestIds.length > table.capacity) {
    const free = table.capacity - staying;
    return {
      ok: false,
      reason: "capacity",
      message:
        guestIds.length === 1
          ? `${table.label} is full (${table.capacity} of ${table.capacity} seats)`
          : `${table.label} has ${free} free seat${free === 1 ? "" : "s"}; this group needs ${guestIds.length}`,
    };
  }
  return { ok: true };
}

/** Everyone who should move together with a guest: their household. */
export function householdOf(guestId: string, guests: SeatingGuest[]): string[] {
  const g = guests.find((x) => x.id === guestId);
  if (!g) return [];
  return guests.filter((x) => x.householdId === g.householdId && occupiesSeat(x)).map((x) => x.id);
}

export interface PreferenceWarning {
  kind: "together" | "apart" | "child_without_adult";
  message: string;
  guestIds: string[];
}

/** Soft rules: produce warnings, never block the couple's choices. */
export function checkPreferences(
  guests: SeatingGuest[],
  assignments: Assignment[],
  preferences: SeatingPreference[],
  names: (guestId: string) => string = (id) => id,
): PreferenceWarning[] {
  const tableOf = new Map(assignments.map((a) => [a.guestId, a.tableId]));
  const warnings: PreferenceWarning[] = [];

  const membersOf = (groupId?: string) => guests.filter((g) => g.groupId === groupId).map((g) => g.id);

  for (const p of preferences) {
    const left = p.guestA ? [p.guestA] : membersOf(p.groupA);
    const right = p.guestB ? [p.guestB] : membersOf(p.groupB);
    if (p.kind === "together" && p.guestA && p.guestB) {
      const ta = tableOf.get(p.guestA);
      const tb = tableOf.get(p.guestB);
      if (ta && tb && ta !== tb) {
        warnings.push({
          kind: "together",
          message: `${names(p.guestA)} and ${names(p.guestB)} should sit together`,
          guestIds: [p.guestA, p.guestB],
        });
      }
    }
    if (p.kind === "apart") {
      for (const a of left)
        for (const b of right) {
          const ta = tableOf.get(a);
          if (ta && ta === tableOf.get(b)) {
            warnings.push({
              kind: "apart",
              message: `${names(a)} and ${names(b)} asked to be seated apart`,
              guestIds: [a, b],
            });
          }
        }
    }
  }

  // Children should share a table with at least one adult from their household.
  for (const child of guests.filter((g) => g.isChild && occupiesSeat(g))) {
    const t = tableOf.get(child.id);
    if (!t) continue;
    const adults = guests.filter(
      (g) => g.householdId === child.householdId && !g.isChild && occupiesSeat(g) && tableOf.has(g.id),
    );
    if (adults.length > 0 && !adults.some((a) => tableOf.get(a.id) === t)) {
      warnings.push({
        kind: "child_without_adult",
        message: `${names(child.id)} is not at a table with a parent or guardian`,
        guestIds: [child.id],
      });
    }
  }
  return warnings;
}

// ---------------------------------------------------------------------------
// Editing commands with undo/redo. The planner applies commands locally for
// instant feedback, then sends the batch to apply_seating_changes().
// ---------------------------------------------------------------------------

export type SeatingOp =
  | { op: "assign"; guest_id: string; table_id: string; seat_number?: number | null }
  | { op: "unassign"; guest_id: string }
  | { op: "lock"; table_id: string; locked: boolean };

export interface PlannerState {
  tables: SeatingTable[];
  guests: SeatingGuest[];
  assignments: Assignment[];
}

export function applyOp(state: PlannerState, op: SeatingOp): PlannerState {
  switch (op.op) {
    case "assign": {
      const rest = state.assignments.filter((a) => a.guestId !== op.guest_id);
      return {
        ...state,
        assignments: [...rest, { guestId: op.guest_id, tableId: op.table_id, seatNumber: op.seat_number ?? null }],
      };
    }
    case "unassign":
      return { ...state, assignments: state.assignments.filter((a) => a.guestId !== op.guest_id) };
    case "lock":
      return {
        ...state,
        tables: state.tables.map((t) => (t.id === op.table_id ? { ...t, isLocked: op.locked } : t)),
      };
  }
}

/** The op that reverses `op`, computed against the state before it ran. */
export function inverseOp(before: PlannerState, op: SeatingOp): SeatingOp {
  switch (op.op) {
    case "assign":
    case "unassign": {
      const prev = before.assignments.find((a) => a.guestId === op.guest_id);
      return prev
        ? { op: "assign", guest_id: prev.guestId, table_id: prev.tableId, seat_number: prev.seatNumber ?? null }
        : { op: "unassign", guest_id: op.guest_id };
    }
    case "lock": {
      const t = before.tables.find((x) => x.id === op.table_id);
      return { op: "lock", table_id: op.table_id, locked: !!t?.isLocked };
    }
  }
}

export interface History {
  state: PlannerState;
  past: SeatingOp[][]; // each entry: the inverse ops of one user action
  future: SeatingOp[][]; // each entry: the ops to redo one action
  pending: SeatingOp[]; // unsaved ops, in order, for the server
}

export const createHistory = (state: PlannerState): History => ({ state, past: [], future: [], pending: [] });

/** Apply one user action (may be several ops, e.g. seating a household). */
export function perform(h: History, ops: SeatingOp[]): History {
  let state = h.state;
  const inverses: SeatingOp[] = [];
  for (const op of ops) {
    inverses.unshift(inverseOp(state, op));
    state = applyOp(state, op);
  }
  return { state, past: [...h.past, inverses], future: [], pending: [...h.pending, ...ops] };
}

export function undo(h: History): History {
  const last = h.past.at(-1);
  if (!last) return h;
  let state = h.state;
  const redo: SeatingOp[] = [];
  for (const op of last) {
    redo.unshift(inverseOp(state, op));
    state = applyOp(state, op);
  }
  return { state, past: h.past.slice(0, -1), future: [...h.future, redo], pending: [...h.pending, ...last] };
}

export function redo(h: History): History {
  const next = h.future.at(-1);
  if (!next) return h;
  const performed = perform({ ...h, future: [] }, next);
  return { ...performed, future: h.future.slice(0, -1) };
}
