import { cookies } from "next/headers";
import { jwtVerify } from "jose";
import type { Role } from "@/lib/models/types";

// Server-side auth + data helpers for the UI-only frontend. The backend is
// the single source of truth; every page here verifies the JWT cookie and
// calls the backend with `Authorization: Bearer <token>`.

export type SessionUser = {
  id: string;
  role: Role;
  name?: string;
  email?: string;
  mustChangePassword?: boolean;
};

const TOKEN_COOKIE = "token";

function getSecret() {
  return new TextEncoder().encode(process.env.JWT_SECRET || "");
}

export async function getTokenFromCookies(): Promise<string | null> {
  const store = await cookies();
  return store.get(TOKEN_COOKIE)?.value || null;
}

export async function requireSession(): Promise<SessionUser | null> {
  const token = await getTokenFromCookies();
  if (!token) return null;
  try {
    const { payload } = await jwtVerify(token, getSecret());
    const role = payload.role as Role;
    const id = payload.sub;
    if (!role || !id) return null;
    return {
      id,
      role,
      name: typeof payload.name === "string" ? payload.name : undefined,
      email: typeof payload.email === "string" ? payload.email : undefined,
      mustChangePassword: Boolean(payload.mustChangePassword),
    };
  } catch {
    return null;
  }
}

export async function requireRole(roles: Role[]): Promise<SessionUser | null> {
  const user = await requireSession();
  if (!user) return null;
  if (!roles.includes(user.role)) return null;
  return user;
}

export function apiUrl(path: string) {
  const base = (process.env.NEXT_PUBLIC_API_URL || "http://localhost:3001").replace(/\/+$/, "");
  return `${base}${path}`;
}

export async function apiFetchServer<T>(path: string): Promise<T | null> {
  const token = await getTokenFromCookies();
  const res = await fetch(apiUrl(path), {
    headers: token ? { Authorization: `Bearer ${token}` } : undefined,
    cache: "no-store",
  });
  // 401 = not authenticated → pages redirect to /login.
  // Anything else (e.g. a transient 500) throws so app/error.tsx renders an
  // error state instead of silently logging the user out.
  if (res.status === 401) return null;
  if (!res.ok) throw new Error(`API ${path} failed with status ${res.status}`);
  return (await res.json()) as T;
}

// The session user's grantedCapabilities, read fresh from the backend (spec
// 11.7). Capabilities are NOT in the JWT — grants are DB-fresh so they take
// effect without re-login. Admins/residents implicitly hold every capability;
// only interns rely on the returned grants.
export async function getSessionCapabilities(): Promise<string[]> {
  const data = await apiFetchServer<{ user?: { grantedCapabilities?: unknown } }>("/api/auth/me");
  const caps = data?.user?.grantedCapabilities;
  return Array.isArray(caps) ? caps.filter((c): c is string => typeof c === "string") : [];
}
