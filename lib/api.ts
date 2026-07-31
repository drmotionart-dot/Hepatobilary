import { getServerSession } from "next-auth";
import { ObjectId } from "mongodb";
import { authOptions } from "@/lib/auth";
import type { Role } from "@/lib/models/types";

export async function requireSession() {
  return getServerSession(authOptions);
}

export async function requireRole(roles: Role[]) {
  const session = await requireSession();
  if (!session?.user) return null;
  const role = (session.user as any).role as Role;
  if (!roles.includes(role)) return null;
  return session;
}

export function jsonError(message: string, status = 400) {
  return Response.json({ error: message }, { status });
}

export function toObjectId(id: string) {
  return new ObjectId(id);
}
