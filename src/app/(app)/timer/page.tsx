import { redirect } from "next/navigation";
import { getProfile } from "@/lib/data/fetch";

// The Timer UI is rendered by the (app) layout's TabPager; this page only
// keeps parents off the child-only URL on a hard load.
export default async function TimerPage() {
  const profile = await getProfile();
  if (profile?.role === "parent") redirect("/children");
  return null;
}
