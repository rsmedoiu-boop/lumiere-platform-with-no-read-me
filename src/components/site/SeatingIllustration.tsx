import { summariseCapacity, type SeatingGuest, type SeatingTable } from "@/lib/domain/seating";

/**
 * A room of round tables drawn from the real seating rules: the free-seat
 * figure comes from summariseCapacity(), the same code the planner uses.
 */
export function SeatingIllustration({ tables, seatsPerTable, confirmed }: { tables: number; seatsPerTable: number; confirmed: number }) {
  const t: SeatingTable[] = Array.from({ length: tables }, (_, i) => ({ id: `t${i}`, label: `Table ${i + 1}`, capacity: seatsPerTable }));
  const g: SeatingGuest[] = Array.from({ length: confirmed }, (_, i) => ({ id: `g${i}`, householdId: `h${i}`, rsvpStatus: "accepted" }));
  const s = summariseCapacity(t, g, g.map((x, i) => ({ guestId: x.id, tableId: t[Math.floor(i / seatsPerTable)].id })));

  const cols = 5;
  const cell = 92;
  const rows = Math.ceil(tables / cols);
  const width = cols * cell;
  const height = rows * cell;

  return (
    <figure className="border border-line bg-paper p-6 md:p-8">
      <svg viewBox={`0 0 ${width} ${height}`} role="img" aria-label={`${s.totalCapacity} seats, ${s.occupied} confirmed guests seated, ${s.available} seats free`} className="w-full">
        {t.map((table, ti) => {
          const cx = (ti % cols) * cell + cell / 2;
          const cy = Math.floor(ti / cols) * cell + cell / 2;
          return (
            <g key={table.id}>
              <circle cx={cx} cy={cy} r={17} fill="none" stroke="var(--color-line)" />
              <text x={cx} y={cy + 4} textAnchor="middle" fontSize="11" fill="var(--color-ink-soft)" fontFamily="var(--font-sans)">
                {ti + 1}
              </text>
              {Array.from({ length: seatsPerTable }, (_, si) => {
                const angle = (si / seatsPerTable) * Math.PI * 2 - Math.PI / 2;
                const filled = ti * seatsPerTable + si < s.occupied;
                return (
                  <circle
                    key={si}
                    cx={cx + Math.cos(angle) * 30}
                    cy={cy + Math.sin(angle) * 30}
                    r={5}
                    fill={filled ? "var(--color-ink)" : "var(--color-paper)"}
                    stroke={filled ? "var(--color-ink)" : "var(--color-foil)"}
                  />
                );
              })}
            </g>
          );
        })}
      </svg>
      <figcaption className="mt-6 grid grid-cols-3 border-t border-line pt-5 text-center">
        <div>
          <p className="font-display text-4xl">{s.totalCapacity}</p>
          <p className="text-xs text-ink-soft">seats across {tables} tables</p>
        </div>
        <div>
          <p className="font-display text-4xl">{s.occupied}</p>
          <p className="text-xs text-ink-soft">confirmed and seated</p>
        </div>
        <div>
          <p className="font-display text-4xl text-foil-deep">{s.available}</p>
          <p className="text-xs text-ink-soft">seats still free</p>
        </div>
      </figcaption>
    </figure>
  );
}
