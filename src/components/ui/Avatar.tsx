import Image from "next/image";
import { cn } from "@/lib/utils";

interface AvatarProps {
  src?: string | null;
  username: string;
  size?: "sm" | "md" | "lg" | "xl";
  className?: string;
}

const SIZES = { sm: 28, md: 36, lg: 48, xl: 80 };

export function Avatar({ src, username, size = "md", className }: AvatarProps) {
  const px = SIZES[size];
  const initials = username.slice(0, 2).toUpperCase();

  return (
    <div
      className={cn(
        "relative shrink-0 overflow-hidden rounded-full bg-neutral-200 dark:bg-neutral-700",
        className
      )}
      style={{ width: px, height: px }}
    >
      {src ? (
        <Image src={src} alt={username} fill className="object-cover" sizes={`${px}px`} />
      ) : (
        <span className="flex h-full w-full items-center justify-center text-xs font-semibold text-neutral-600 dark:text-neutral-300">
          {initials}
        </span>
      )}
    </div>
  );
}
