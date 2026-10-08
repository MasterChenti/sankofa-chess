import { redirect } from "next/navigation";

/** The old dashboard became Today: a finite daily session instead of a wall of widgets. */
export default function HomeRedirect() {
  redirect("/app/today");
}
