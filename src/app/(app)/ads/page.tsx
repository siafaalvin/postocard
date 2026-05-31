import { redirect } from "next/navigation";

export default function AdsPage() {
  redirect("/settings?tab=ads");
}
