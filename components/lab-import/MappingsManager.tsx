"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import Button from "@/components/ui/Button";
import Card from "@/components/ui/Card";
import EmptyState from "@/components/ui/EmptyState";
import { Input } from "@/components/ui/Input";
import { Label } from "@/components/ui/Label";
import { Select } from "@/components/ui/Select";
import { LAB_CATEGORIES } from "@/lib/constants";
import { apiFetch } from "@/lib/client-api";

export default function MappingsManager({ mappings }: { mappings: any[] }) {
  const router = useRouter();
  const [externalTestName, setExternalTestName] = useState("");
  const [internalTestKey, setInternalTestKey] = useState("");
  const [category, setCategory] = useState("Others");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  async function addMapping(e: React.FormEvent) {
    e.preventDefault();
    setError("");
    setLoading(true);
    const res = await apiFetch("/api/lab-test-name-mappings", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ externalTestName, internalTestKey, category }),
    });
    setLoading(false);

    if (!res.ok) {
      const d = await res.json();
      setError(d.error || "Could not add mapping");
      return;
    }
    setExternalTestName("");
    setInternalTestKey("");
    router.refresh();
  }

  return (
    <div className="flex flex-col gap-5">
      <Card title="Add a test-name mapping">
        <form onSubmit={addMapping} className="grid grid-cols-1 sm:grid-cols-4 gap-3">
          <div>
            <Label>External name (PDF)</Label>
            <Input value={externalTestName} onChange={(e) => setExternalTestName(e.target.value)} placeholder="e.g. SGPT (ALT)" required />
          </div>
          <div>
            <Label>Internal key</Label>
            <Input value={internalTestKey} onChange={(e) => setInternalTestKey(e.target.value)} placeholder="e.g. ALT" required />
          </div>
          <div>
            <Label>Category</Label>
            <Select value={category} onChange={(e) => setCategory(e.target.value)}>
              {LAB_CATEGORIES.map((c) => <option key={c}>{c}</option>)}
            </Select>
          </div>
          <div className="flex items-end">
            <Button type="submit" loading={loading}>{loading ? "Saving…" : "Add"}</Button>
          </div>
        </form>
        {error && <p className="text-xs text-danger mt-2">{error}</p>}
      </Card>

      <Card title={`Mappings (${mappings.length})`}>
        {mappings.length === 0 ? (
          <EmptyState title="No mappings yet." className="py-6" />
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="text-left text-xs text-muted border-b border-border">
                  <th className="py-2 pr-3">External (PDF) name</th>
                  <th className="py-2 pr-3">Internal key</th>
                  <th className="py-2">Category</th>
                </tr>
              </thead>
              <tbody>
                {mappings.map((m) => (
                  <tr key={m._id} className="border-b border-border">
                    <td className="py-2 pr-3 font-medium">{m.externalTestName}</td>
                    <td className="py-2 pr-3">{m.internalTestKey}</td>
                    <td className="py-2">{m.category}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </Card>
    </div>
  );
}
