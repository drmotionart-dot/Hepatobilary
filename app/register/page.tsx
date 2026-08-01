"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import Button from "@/components/ui/Button";
import { Input } from "@/components/ui/Input";
import { Label } from "@/components/ui/Label";
import { Select } from "@/components/ui/Select";
import { apiFetch } from "@/lib/client-api";

export default function RegisterPage() {
  const router = useRouter();
  const [fullName, setFullName] = useState("");
  const [email, setEmail] = useState("");
  const [phone, setPhone] = useState("");
  const [password, setPassword] = useState("");
  const [role, setRole] = useState("intern");
  const [message, setMessage] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError("");
    setMessage("");
    setLoading(true);

    const res = await apiFetch("/api/register", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ fullName, email, phone, password, role }),
    });
    const data = await res.json();
    setLoading(false);

    if (!res.ok) {
      setError(data.error || "Registration failed");
      return;
    }
    setMessage(data.message || "Registration submitted.");
    setTimeout(() => router.push("/login"), 2000);
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-bg px-4">
      <div className="w-full max-w-sm rounded-2xl bg-surface p-6 shadow-sm border border-border">
        <h1 className="text-lg font-semibold text-primary mb-1">Request access</h1>
        <p className="text-sm text-ink/60 mb-6">
          Your account stays inactive until an admin approves it.
        </p>

        <form onSubmit={handleSubmit} className="flex flex-col gap-3">
          <div>
            <Label htmlFor="fullName">Full name</Label>
            <Input id="fullName" dir="auto" value={fullName} onChange={(e) => setFullName(e.target.value)} required />
          </div>
          <div>
            <Label htmlFor="email">Email</Label>
            <Input id="email" type="email" value={email} onChange={(e) => setEmail(e.target.value)} required />
          </div>
          <div>
            <Label htmlFor="phone">Phone (optional)</Label>
            <Input id="phone" type="tel" value={phone} onChange={(e) => setPhone(e.target.value)} />
            <p className="text-[11px] text-ink/50 mt-1">Used to match your account to roster imports automatically.</p>
          </div>
          <div>
            <Label htmlFor="password">Password</Label>
            <Input id="password" type="password" value={password} onChange={(e) => setPassword(e.target.value)} minLength={8} required />
          </div>
          <div>
            <Label htmlFor="role">Role</Label>
            <Select id="role" value={role} onChange={(e) => setRole(e.target.value)}>
              <option value="intern">Intern</option>
              <option value="resident">Resident</option>
            </Select>
          </div>

          {error && <p className="text-xs text-danger">{error}</p>}
          {message && <p className="text-xs text-success">{message}</p>}

          <Button type="submit" loading={loading}>
            {loading ? "Submitting…" : "Submit request"}
          </Button>
        </form>

        <Link href="/login" className="mt-4 inline-block text-xs text-ink/50 hover:text-ink/80">
          Back to sign in
        </Link>
      </div>
    </div>
  );
}
