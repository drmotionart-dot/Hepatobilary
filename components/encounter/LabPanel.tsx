import { Fragment } from "react";
import EmptyState from "@/components/ui/EmptyState";
import type { LabResultEntry } from "@/lib/models/types";

const dateKey = (d: string | Date) => new Date(d).toDateString();
const shortDate = (d: string | Date) =>
  new Date(d).toLocaleDateString("en-GB", { day: "2-digit", month: "short" });

export default function LabPanel({ results, presetTests = [] }: { results: LabResultEntry[]; presetTests?: string[] }) {
  if (results.length === 0) {
    if (presetTests.length > 0) {
      return (
        <div className="rounded-lg bg-primary/5 p-3 mb-3">
          <p className="text-xs font-medium text-primary mb-1">Awaiting results (ordered with this case type)</p>
          <p className="text-xs text-muted font-mono">{presetTests.join(" · ")}</p>
        </div>
      );
    }
    return <EmptyState title="No lab results yet." className="py-6 mb-3" />;
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
          <tr className="text-left text-xs text-muted border-b border-border">
            <th className="py-2 pr-3 font-medium sticky left-0 bg-surface">Test</th>
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
                  <td colSpan={dates.length + 1} className="pt-3 pb-1 text-xs font-semibold uppercase tracking-wide text-muted border-b border-border">
                    {category}
                  </td>
                </tr>
                {tests.map((test) => {
                  const first = rows.find((r) => r.test === test)!;
                  return (
                    <tr key={test} className="border-b border-border">
                      <td className="py-1.5 pr-3 sticky left-0 bg-surface">
                        <span className="font-medium">{test}</span>
                        {(first.unit || first.refRange) && (
                          <span className="block text-xs text-muted">
                            {first.unit ? first.unit : ""}
                            {first.unit && first.refRange ? " · " : ""}
                            {first.refRange ? `ref ${first.refRange}` : ""}
                          </span>
                        )}
                      </td>
                      {dates.map((d) => {
                        const entry = byCell.get(`${d}|${test}`);
                        if (!entry) {
                          return <td key={d} className="py-1.5 pr-3 text-right text-muted font-mono">—</td>;
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
      {presetTests.length > 0 && (
        <p className="text-xs text-muted mt-2">
          Still awaiting: <span className="font-mono">{presetTests.join(" · ")}</span>
        </p>
      )}
    </div>
  );
}
