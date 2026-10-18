import { redirect } from "next/navigation";
import { getProfile } from "@/lib/data/fetch";

// The Children Log UI is rendered by the (app) layout's TabPager; this page
// only keeps children off the parent-only URL on a hard load.
export default async function ChildrenLogPage() {
  const profile = await getProfile();
  if (!profile) redirect("/login");
  if (profile.role !== "parent") redirect("/timer");
  return null;
}
