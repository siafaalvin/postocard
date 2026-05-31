import { redirect } from "next/navigation";

export default function LocalPage() {
  redirect("/feed?tab=local");
}
