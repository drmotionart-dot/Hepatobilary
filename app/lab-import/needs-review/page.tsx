import { redirect } from "next/navigation";

// The lab review queue moved under the Admin hub (app/admin/lab-review).
// Keep the old deep link working for bookmarks / printed materials.
export default function NeedsReviewRedirect() {
  redirect("/admin/lab-review");
}
