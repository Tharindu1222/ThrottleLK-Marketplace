'use client';

import type { AdminDashboard } from '@/lib/admin-types';

const COLORS = ['#7c5cfc', '#38bdf8', '#f43f5e', '#22c55e', '#ec4899'];

export function OverviewCharts({ dash }: { dash: AdminDashboard }) {
  const slices = [
    { label: 'Active listings', value: dash.activeListings, color: COLORS[0] },
    { label: 'Pending listings', value: dash.pendingListings, color: COLORS[1] },
    { label: 'Pending dealers', value: dash.pendingDealers, color: COLORS[2] },
    { label: 'Open reports', value: dash.openReports, color: COLORS[3] },
  ];
  const total = slices.reduce((sum, s) => sum + s.value, 0) || 1;
  const queueLoad =
    dash.pendingListings + dash.pendingDealers + dash.openReports;
  const capacityScore = Math.max(0, Math.min(1000, 1000 - queueLoad * 40));
  const riskLabel =
    capacityScore >= 750 ? 'Healthy' : capacityScore >= 500 ? 'Watch' : 'Busy';
  const riskColor =
    capacityScore >= 750 ? '#22c55e' : capacityScore >= 500 ? '#f59e0b' : '#f43f5e';

  let angle = -90;
  const arcs = slices
    .filter((slice) => slice.value > 0)
    .map((slice) => {
      const sweep = Math.max((slice.value / total) * 360, 0.01);
      const start = angle;
      angle += sweep;
      return { ...slice, start, sweep };
    });

  const maxBar = Math.max(...slices.map((s) => s.value), dash.users, 1);

  return (
    <div className="grid gap-4 lg:grid-cols-5">
      <div className="admin-card p-5 lg:col-span-3">
        <div className="flex items-center justify-between gap-3">
          <h2 className="font-[family-name:var(--font-display)] text-xl tracking-wide text-[var(--admin-text)]">
            Queue mix
          </h2>
          <span className="rounded-full bg-[var(--admin-surface-2)] px-3 py-1 text-xs text-[var(--admin-muted)]">
            Live snapshot
          </span>
        </div>
        <div className="mt-6 space-y-4">
          {[
            { label: 'Users', value: dash.users, color: '#a78bfa' },
            ...slices,
          ].map((row) => (
            <div key={row.label}>
              <div className="mb-1.5 flex justify-between text-sm">
                <span className="text-[var(--admin-muted)]">{row.label}</span>
                <span className="font-semibold text-[var(--admin-text)]">{row.value}</span>
              </div>
              <div className="h-2.5 overflow-hidden rounded-full bg-[var(--admin-bg)]">
                <div
                  className="h-full rounded-full transition-all duration-500"
                  style={{
                    width: `${Math.max(4, (row.value / maxBar) * 100)}%`,
                    backgroundColor: row.color,
                    boxShadow: `0 0 12px ${row.color}55`,
                  }}
                />
              </div>
            </div>
          ))}
        </div>
      </div>

      <div className="space-y-4 lg:col-span-2">
        <div className="admin-card p-5">
          <div className="flex items-center justify-between">
            <h2 className="font-[family-name:var(--font-display)] text-xl tracking-wide text-[var(--admin-text)]">
              Ops score
            </h2>
            <span
              className="rounded-full px-2.5 py-1 text-xs font-medium text-white"
              style={{ backgroundColor: riskColor }}
            >
              {riskLabel}
            </span>
          </div>
          <div className="relative mx-auto mt-4 h-36 w-56">
            <svg viewBox="0 0 200 120" className="h-full w-full">
              <path
                d="M20 100 A80 80 0 0 1 180 100"
                fill="none"
                stroke="var(--admin-bg)"
                strokeWidth="16"
                strokeLinecap="round"
              />
              <path
                d="M20 100 A80 80 0 0 1 180 100"
                fill="none"
                stroke={riskColor}
                strokeWidth="16"
                strokeLinecap="round"
                strokeDasharray={`${(capacityScore / 1000) * 251} 251`}
                style={{ filter: `drop-shadow(0 0 6px ${riskColor})` }}
              />
            </svg>
            <div className="absolute inset-0 flex flex-col items-center justify-end pb-2">
              <p className="font-[family-name:var(--font-display)] text-3xl text-[var(--admin-text)]">
                {capacityScore}
              </p>
              <p className="text-xs text-[var(--admin-faint)]">/ 1000</p>
            </div>
          </div>
          <p className="mt-2 text-center text-xs text-[var(--admin-muted)]">
            Higher when moderation queues are light.
          </p>
        </div>

        <div className="admin-card p-5">
          <h2 className="font-[family-name:var(--font-display)] text-xl tracking-wide text-[var(--admin-text)]">
            Workload split
          </h2>
          <div className="mt-4 flex items-center gap-5">
            <svg viewBox="0 0 120 120" className="h-28 w-28 shrink-0">
              {arcs.map((arc) => (
                <path
                  key={arc.label}
                  d={describeArc(60, 60, 42, arc.start, arc.start + arc.sweep)}
                  fill="none"
                  stroke={arc.color}
                  strokeWidth="16"
                  strokeLinecap="butt"
                  style={{ filter: `drop-shadow(0 0 4px ${arc.color}88)` }}
                />
              ))}
              <text
                x="60"
                y="58"
                textAnchor="middle"
                fill="var(--admin-text)"
                style={{ fontSize: '18px', fontWeight: 700 }}
              >
                {Math.round(((dash.activeListings || 0) / total) * 100) || 0}%
              </text>
              <text
                x="60"
                y="74"
                textAnchor="middle"
                fill="var(--admin-faint)"
                style={{ fontSize: '9px' }}
              >
                active
              </text>
            </svg>
            <ul className="space-y-2 text-xs">
              {slices.map((s) => (
                <li
                  key={s.label}
                  className="flex items-center gap-2 text-[var(--admin-muted)]"
                >
                  <span
                    className="h-2.5 w-2.5 rounded-full"
                    style={{ backgroundColor: s.color }}
                  />
                  {s.label}
                </li>
              ))}
            </ul>
          </div>
        </div>
      </div>
    </div>
  );
}

function polarToCartesian(cx: number, cy: number, r: number, angleDeg: number) {
  const rad = ((angleDeg - 90) * Math.PI) / 180;
  return { x: cx + r * Math.cos(rad), y: cy + r * Math.sin(rad) };
}

function describeArc(
  cx: number,
  cy: number,
  r: number,
  startAngle: number,
  endAngle: number,
) {
  const start = polarToCartesian(cx, cy, r, endAngle);
  const end = polarToCartesian(cx, cy, r, startAngle);
  const large = endAngle - startAngle <= 180 ? '0' : '1';
  return `M ${start.x} ${start.y} A ${r} ${r} 0 ${large} 0 ${end.x} ${end.y}`;
}
