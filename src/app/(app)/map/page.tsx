import type { Metadata } from "next";
import { MapView } from "@/components/map/MapView";

export const metadata: Metadata = { title: "Map" };

export default function MapPage() {
  return (
    <div className="-mx-4 -my-6">
      <MapView />
    </div>
  );
}
