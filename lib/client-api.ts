"use client";

// Client-side API helper. Stores the JWT in a readable cookie (so server
// pages can verify it too) and attaches it to every backend request.

const API_BASE = (process.env.NEXT_PUBLIC_API_URL || "http://localhost:3001").replace(/\/+$/, "");
const TOKEN_COOKIE = "token";

export function getToken(): string | null {
  if (typeof window === "undefined") return null;
  const match = document.cookie.match(/(?:^|; )token=([^;]*)/);
  return match ? decodeURIComponent(match[1]) : null;
}

export function setToken(token: string) {
  if (typeof window === "undefined") return;
  document.cookie = `${TOKEN_COOKIE}=${encodeURIComponent(token)}; path=/; max-age=28800; SameSite=Lax`;
}

export function clearToken() {
  if (typeof window === "undefined") return;
  document.cookie = `${TOKEN_COOKIE}=; path=/; max-age=0; SameSite=Lax`;
}

export async function apiFetch(path: string, options: RequestInit = {}): Promise<Response> {
  const token = getToken();
  const headers = new Headers(options.headers || {});
  if (token) headers.set("Authorization", `Bearer ${token}`);
  const res = await fetch(`${API_BASE}${path}`, { ...options, headers });
  if (res.status === 401) {
    clearToken();
    if (typeof window !== "undefined" && !path.includes("/auth/login")) {
      window.location.href = "/login";
    }
  }
  return res;
}
