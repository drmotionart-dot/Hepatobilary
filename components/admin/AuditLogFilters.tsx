"use client";

import { useState, useEffect } from "react";
import { useRouter, usePathname } from "next/navigation";
import Button from "@/components/ui/Button";
import { Input } from "@/components/ui/Input";
import { Label } from "@/components/ui/Label";
import { Select } from "@/components/ui/Select";
import { apiFetch } from "@/lib/client-api";

type Filters = { collection?: string; action?: string; user?: string; from?: string; to?: string };

export default function AuditLogFilters({ initial }: { initial: Filters }) {
  const router = useRouter();
  const pathname = usePathname();
  const [collection, setCollection] = useState(initial.collection || "");
  const [action, setAction] = useState(initial.action || "");
  const [user, setUser] = useState(initial.user || "");
  const [from, setFrom] = useState(initial.from || "");
  const [to, setTo] = useState(initial.to || "");
  const [options, setOptions] = useState<{ collections: string[]; users: { _id: string; fullName: string }[] }>({
    collections: [],
    users: [],
  });

  useEffect(() => {
    apiFetch("/api/audit-log/options").then((r) => r.ok && r.json()).then((d) => {
      if (d) setOptions(d);
    });
  }, []);

  function apply() {
    const params = new URLSearchParams();
    if (collection) params.set("collection", collection);
    if (action) params.set("action", action);
    if (user) params.set("user", user);
    if (from) params.set("from", from);
    if (to) params.set("to", to);
    const qs = params.toString();
    router.push(qs ? `${pathname}?${qs}` : pathname);
    router.refresh();
  }

  function reset() {
    setCollection("");
    setAction("");
    setUser("");
    setFrom("");
    setTo("");
    router.push(pathname);
    router.refresh();
  }

  return (
    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-3 items-end p-4 border-b border-border">
      <div>
        <Label>Collection</Label>
        <Select value={collection} onChange={(e) => setCollection(e.target.value)}>
          <option value="">All</option>
          {options.collections.map((c) => (
            <option key={c} value={c}>{c}</option>
          ))}
        </Select>
      </div>
      <div>
        <Label>Action</Label>
        <Select value={action} onChange={(e) => setAction(e.target.value)}>
          <option value="">All</option>
          <option value="create">create</option>
          <option value="update">update</option>
          <option value="delete">delete</option>
        </Select>
      </div>
      <div>
        <Label>User</Label>
        <Select value={user} onChange={(e) => setUser(e.target.value)}>
          <option value="">All</option>
          {options.users.map((u) => (
            <option key={u._id} value={u._id} dir="auto">{u.fullName}</option>
          ))}
        </Select>
      </div>
      <div>
        <Label>From</Label>
        <Input type="date" value={from} onChange={(e) => setFrom(e.target.value)} />
      </div>
      <div>
        <Label>To</Label>
        <Input type="date" value={to} onChange={(e) => setTo(e.target.value)} />
      </div>
      <div className="col-span-1 sm:col-span-2 lg:col-span-5 flex gap-2">
        <Button size="sm" onClick={apply}>Apply filters</Button>
        <Button size="sm" variant="ghost" onClick={reset}>Reset</Button>
      </div>
    </div>
  );
}
