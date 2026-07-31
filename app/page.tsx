import { redirect } from "next/navigation";
import { requireSession } from "@/lib/api";

export default async function HomePage() {
  const session = await requireSession();
  redirect(session ? "/dashboard" : "/login");
}
