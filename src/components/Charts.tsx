import { useState } from 'react';
import { MonthlyRevenuePoint, ServiceStatPoint } from '../types';
import { formatCurrency } from '../lib/api';

export function MonthlyRevenueChart({ data }: { data: MonthlyRevenuePoint[] }) {
  const [hoveredIdx, setHoveredIdx] = useState<number | null>(null);

  if (!data || data.length === 0) {
    return (
      <div className="h-56 flex items-center justify-center text-sm text-slate-500">
        No payment records available yet.
      </div>
    );
  }

  const maxRev = Math.max(...data.map((d) => d.total_revenue), 1000);
  const chartHeight = 190;
  const chartWidth = 520;
  const padLeft = 58;
  const padRight = 16;
  const padTop = 18;
  const padBottom = 32;
  const plotW = chartWidth - padLeft - padRight;
  const plotH = chartHeight - padTop - padBottom;
  const slotW = plotW / data.length;
  const barW = Math.min(42, slotW * 0.56);

  return (
    <div className="relative w-full">
      <svg viewBox={`0 0 ${chartWidth} ${chartHeight}`} className="w-full h-56 overflow-visible">
        {[0, 0.25, 0.5, 0.75, 1].map((ratio) => {
          const y = padTop + plotH * (1 - ratio);
          const val = Math.round(maxRev * ratio);
          return (
            <g key={ratio}>
              <line x1={padLeft} y1={y} x2={chartWidth - padRight} y2={y} stroke="#E2E8F0" strokeDasharray="3 3" />
              <text
                x={padLeft - 8}
                y={y + 4}
                textAnchor="end"
                className="fill-slate-400 text-[10px] font-mono tabular-nums"
              >
                {val >= 1000 ? `${(val / 1000).toFixed(1)}k` : val}
              </text>
            </g>
          );
        })}

        {data.map((d, idx) => {
          const barH = Math.max(4, (d.total_revenue / maxRev) * plotH);
          const x = padLeft + idx * slotW + (slotW - barW) / 2;
          const y = padTop + plotH - barH;
          const isHovered = hoveredIdx === idx;
          const isLatest = idx === data.length - 1;

          return (
            <g
              key={d.month_key}
              onMouseEnter={() => setHoveredIdx(idx)}
              onMouseLeave={() => setHoveredIdx(null)}
              className="cursor-pointer"
            >
              <rect
                x={x}
                y={y}
                width={barW}
                height={barH}
                rx={4}
                fill={isHovered ? '#EAB308' : isLatest ? '#CA8A04' : '#0F213A'}
                className="transition-colors duration-150"
              />
              <text
                x={x + barW / 2}
                y={chartHeight - 10}
                textAnchor="middle"
                className="fill-slate-500 text-[11px] font-mono"
              >
                {d.month_key}
              </text>
              {isHovered && (
                <g transform={`translate(${Math.min(Math.max(x + barW / 2, 70), chartWidth - 70)}, ${Math.max(y - 10, 24)})`}>
                  <rect x={-58} y={-34} width={116} height={28} rx={5} fill="#0B192C" />
                  <text x={0} y={-16} textAnchor="middle" className="fill-white text-[11px] font-mono font-medium">
                    {formatCurrency(d.total_revenue)} ({d.payment_count})
                  </text>
                </g>
              )}
            </g>
          );
        })}
      </svg>
    </div>
  );
}

export function CustomerGrowthChart({ data }: { data: { month_key: string; new_customers: number }[] }) {
  const [hoveredIdx, setHoveredIdx] = useState<number | null>(null);

  if (!data || data.length === 0) {
    return (
      <div className="h-56 flex items-center justify-center text-sm text-slate-500">
        No customer registration history yet.
      </div>
    );
  }

  let cumulative = 0;
  const points = data.map((d) => {
    cumulative += d.new_customers;
    return { ...d, cumulative };
  });

  const maxVal = Math.max(...points.map((p) => p.cumulative), 5);
  const chartW = 520;
  const chartH = 190;
  const padLeft = 40;
  const padRight = 24;
  const padTop = 20;
  const padBottom = 32;
  const plotW = chartW - padLeft - padRight;
  const plotH = chartH - padTop - padBottom;

  const coords = points.map((p, idx) => {
    const x = points.length === 1 ? padLeft + plotW / 2 : padLeft + (idx / (points.length - 1)) * plotW;
    const y = padTop + plotH - (p.cumulative / maxVal) * plotH;
    return { ...p, x, y };
  });

  const linePath = coords.map((c, idx) => `${idx === 0 ? 'M' : 'L'} ${c.x} ${c.y}`).join(' ');
  const areaPath = `${linePath} L ${coords[coords.length - 1].x} ${padTop + plotH} L ${coords[0].x} ${padTop + plotH} Z`;

  return (
    <div className="relative w-full">
      <svg viewBox={`0 0 ${chartW} ${chartH}`} className="w-full h-56 overflow-visible">
        <defs>
          <linearGradient id="navyAreaGrad" x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%" stopColor="#0F213A" stopOpacity="0.18" />
            <stop offset="100%" stopColor="#0F213A" stopOpacity="0.01" />
          </linearGradient>
        </defs>

        {[0, 0.5, 1].map((ratio) => {
          const y = padTop + plotH * (1 - ratio);
          const val = Math.round(maxVal * ratio);
          return (
            <g key={ratio}>
              <line x1={padLeft} y1={y} x2={chartW - padRight} y2={y} stroke="#E2E8F0" strokeDasharray="3 3" />
              <text x={padLeft - 8} y={y + 4} textAnchor="end" className="fill-slate-400 text-[10px] font-mono">
                {val}
              </text>
            </g>
          );
        })}

        {coords.length > 1 && <path d={areaPath} fill="url(#navyAreaGrad)" />}
        {coords.length > 1 && <path d={linePath} fill="none" stroke="#0F213A" strokeWidth="2.5" strokeLinejoin="round" />}

        {coords.map((c, idx) => {
          const isHovered = hoveredIdx === idx;
          return (
            <g
              key={c.month_key}
              onMouseEnter={() => setHoveredIdx(idx)}
              onMouseLeave={() => setHoveredIdx(null)}
              className="cursor-pointer"
            >
              <circle
                cx={c.x}
                cy={c.y}
                r={isHovered ? 6 : 4.5}
                fill={isHovered ? '#EAB308' : '#FFFFFF'}
                stroke="#0F213A"
                strokeWidth="2.5"
              />
              <text x={c.x} y={chartH - 10} textAnchor="middle" className="fill-slate-500 text-[11px] font-mono">
                {c.month_key}
              </text>
              {isHovered && (
                <g transform={`translate(${Math.min(Math.max(c.x, 70), chartW - 70)}, ${Math.max(c.y - 12, 26)})`}>
                  <rect x={-64} y={-32} width={128} height={26} rx={5} fill="#0B192C" />
                  <text x={0} y={-15} textAnchor="middle" className="fill-white text-[11px] font-mono">
                    {c.cumulative} total (+{c.new_customers})
                  </text>
                </g>
              )}
            </g>
          );
        })}
      </svg>
    </div>
  );
}

export function ServiceDistributionPanel({ data }: { data: ServiceStatPoint[] }) {
  const total = data.reduce((acc, s) => acc + s.total_services, 0) || 1;
  const colorMap: Record<string, string> = {
    Mobile: '#0F213A',
    Broadband: '#CA8A04',
    Landline: '#3B6699',
  };

  return (
    <div className="space-y-4">
      <div className="h-3.5 w-full rounded-full bg-slate-100 overflow-hidden flex">
        {data.map((item) => {
          const pct = (item.total_services / total) * 100;
          return (
            <div
              key={item.service_type}
              style={{ width: `${pct}%`, backgroundColor: colorMap[item.service_type] || '#0F213A' }}
              className="h-full transition-all duration-300"
              title={`${item.service_type}: ${item.total_services}`}
            />
          );
        })}
      </div>

      <div className="divide-y divide-slate-100">
        {data.map((item) => {
          const pct = Math.round((item.total_services / total) * 100);
          return (
            <div key={item.service_type} className="py-2.5 flex items-center justify-between text-sm">
              <div className="flex items-center gap-2.5">
                <span
                  className="w-2.5 h-2.5 rounded-sm shrink-0"
                  style={{ backgroundColor: colorMap[item.service_type] || '#0F213A' }}
                />
                <span className="font-medium text-[#0F213A]">{item.service_type}</span>
              </div>
              <div className="flex items-center gap-4 tabular-nums font-mono text-xs text-slate-600">
                <span>
                  {item.active_services}/{item.total_services} active
                </span>
                <span className="font-semibold text-[#0F213A] w-9 text-right">{pct}%</span>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
