import { redirect } from "next/navigation";

export default function StoriesRedirect() {
  redirect("/app/discover");
}
