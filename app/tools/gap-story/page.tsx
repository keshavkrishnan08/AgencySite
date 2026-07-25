import { redirect } from "next/navigation";

/* Consolidated into the Prep tools page. Kept as a permanent redirect so old
   links, bookmarks, and deep-links keep working. */
export default function GapStoryRedirect() {
  redirect("/prep?tab=gap");
}
