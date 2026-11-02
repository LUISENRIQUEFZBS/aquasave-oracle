"use client";

import type { ScoreBracket } from "@/lib/certification-criteria";

export default function ScoreCriteriaTable({
  title,
  table,
  active,
}: {
  title: string;
  table: ScoreBracket[];
  active: ScoreBracket | null;
}) {
  const maxPoints = Math.max(...table.map((b) => b.points));

  return (
    <div className="overflow-hidden rounded-md border border-border">
      <div className="bg-bg px-3 py-1.5 text-xs font-semibold text-text">{title}</div>
      <table className="w-full text-xs">
        <tbody>
          {table.map((b) => {
            const isActive = active?.label === b.label;
            let rowClass = "text-text-muted";
            if (isActive) {
              if (b.points === maxPoints) rowClass = "bg-success/15 text-success font-medium";
              else if (b.points === 0) rowClass = "bg-danger/15 text-danger font-medium";
              else rowClass = "bg-warning/15 text-warning font-medium";
            }
            return (
              <tr key={b.label} className={rowClass}>
                <td className="px-3 py-1.5">{b.label}</td>
                <td className="px-3 py-1.5 text-right font-mono">{b.points} pts</td>
              </tr>
            );
          })}
        </tbody>
      </table>
    </div>
  );
}