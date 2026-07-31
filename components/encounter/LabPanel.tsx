import { Fragment } from "react";
import type { LabResultEntry } from "@/lib/models/types";

const dateKey = (d: string | Date) => new Date(d).toDateString();
const shortDate = (d: string | Date) =>
  new Date(d).toLocaleDateString("en-GB", { day: "2-digit", month: "short" });

export default function LabPanel({ results }: { results: LabResultEntry[] }) {
  if (results.length === 0) {
    return <p className="text-sm text-ink/50 mb-3">No lab results yet.</p>;
  }

  const dates = [...new Set(results.map((r) => dateKey(r.date)))].sort(
    (a, b) => new Date(a).getTime() - new Date(b).getTime()
  );

  const categories: string[] = [];
  for (const r of results) {
    if (!categories.includes(r.category)) categories.push(r.category);
  }

  const byCell = new Map<string, LabResultEntry>();
  for (const r of results) {
    byCell.set(`${dateKey(r.date)}|${r.test}`, r);
  }

  return (
    <div className="overflow-x-auto mb-4">
      <table className="w-full text-sm border-collapse">
        <thead>
          <tr className="text-left text-xs text-ink/50 border-b border-black/20">
            <th className="py-2 pr-3 font-medium sticky left-0 bg-surface dark:bg-dark-surface">Test</th>
            {dates.map((d) => (
              <th key={d} className="py-2 pr-3 font-medium text-right whitespace-nowrap" title={new Date(d).toDateString()}>
                {shortDate(d)}
              </th>
            ))}
          </tr>
        </thead>
        <tbody>
          {categories.map((category) => {
            const rows = results.filter((r) => r.category === category);
            const tests = [...new Set(rows.map((r) => r.test))];
            return (
              <Fragment key={category}>
                <tr>
                  <td colSpan={dates.length + 1} className="pt-3 pb-1 text-xs font-semibold uppercase tracking-wide text-ink/60 border-b border-black/10">
                    {category}
                  </td>
                </tr>
                {tests.map((test) => {
                  const first = rows.find((r) => r.test === test)!;
                  return (
                    <tr key={test} className="border-b border-black/5">
                      <td className="py-1.5 pr-3 sticky left-0 bg-surface dark:bg-dark-surface">
                        <span className="font-medium">{test}</span>
                        {(first.unit || first.refRange) && (
                          <span className="block text-xs text-ink/40">
                            {first.unit ? first.unit : ""}
                            {first.unit && first.refRange ? " · " : ""}
                            {first.refRange ? `ref ${first.refRange}` : ""}
                          </span>
                        )}
                      </td>
                      {dates.map((d) => {
                        const entry = byCell.get(`${d}|${test}`);
                        if (!entry) {
                          return <td key={d} className="py-1.5 pr-3 text-right text-ink/25 font-mono">—</td>;
                        }
                        const flag = entry.abnormalFlag || (entry.abnormal && (entry.value.startsWith("H") ? "H" : entry.value.startsWith("L") ? "L" : undefined));
                        const tone = flag === "H" ? "text-urgent" : flag === "L" ? "text-pending" : "";
                        return (
                          <td key={d} className={`py-1.5 pr-3 text-right font-mono whitespace-nowrap ${entry.abnormal ? "font-medium" : ""}`}>
                            <span className={tone}>{entry.value.replace(/\s*[HL]$/, "")}</span>
                            {flag && <span className={`${tone} ml-0.5`}>{flag}</span>}
                          </td>
                        );
                      })}
                    </tr>
                  );
                })}
              </Fragment>
            );
          })}
        </tbody>
      </table>
    </div>
  );
}
