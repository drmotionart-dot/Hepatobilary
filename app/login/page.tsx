"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import Button from "@/components/ui/Button";
import { Input } from "@/components/ui/Input";
import { Label } from "@/components/ui/Label";
import { apiFetch, setToken } from "@/lib/client-api";

export default function LoginPage() {
  const router = useRouter();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError("");
    setLoading(true);

    const res = await apiFetch("/api/auth/login", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ email, password }),
    });
    const data = await res.json();
    setLoading(false);

    if (!res.ok) {
      setError(data.error || "Could not sign in");
      return;
    }

    setToken(data.token);

    // Must-change-password users get pushed through the forced flow.
    if (data.user?.mustChangePassword) {
      router.push("/change-password");
      return;
    }
    router.push("/dashboard");
    router.refresh();
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-bg px-4">
      <div className="w-full max-w-sm rounded-2xl bg-surface p-6 shadow-sm border border-black/5">
        <h1 className="text-lg font-semibold text-primary mb-1">HPB Department</h1>
        <p className="text-sm text-ink/60 mb-6">Sign in to continue.</p>

        <form onSubmit={handleSubmit} className="flex flex-col gap-3">
          <div>
            <Label htmlFor="email">Email or username</Label>
            <Input id="email" type="text" value={email} onChange={(e) => setEmail(e.target.value)} required />
          </div>
          <div>
            <Label htmlFor="password">Password</Label>
            <Input id="password" type="password" value={password} onChange={(e) => setPassword(e.target.value)} required />
          </div>

          {error && <p className="text-xs text-danger">{error}</p>}

          <Button type="submit" disabled={loading}>
            {loading ? "Signing in…" : "Sign in"}
          </Button>
        </form>

        <p className="text-xs text-ink/50 mt-4">
          New here?{" "}
          <Link href="/register" className="text-primary font-medium hover:underline">
            Request access
          </Link>{" "}
          — an admin must approve your account before it becomes active.
        </p>
      </div>
    </div>
  );
}
