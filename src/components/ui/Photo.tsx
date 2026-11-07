import Image from "next/image";
import { studioMedia, type StudioMediaKey } from "@/lib/media";

/** A studio photograph from the registry, responsive and lazy by default. */
export function Photo({
  name,
  sizes,
  className = "",
  priority = false,
  decorative = false,
}: {
  name: StudioMediaKey;
  sizes: string;
  className?: string;
  priority?: boolean;
  decorative?: boolean;
}) {
  const m = studioMedia[name];
  return (
    <Image
      src={m.src}
      width={m.width}
      height={m.height}
      alt={decorative ? "" : m.alt}
      sizes={sizes}
      priority={priority}
      className={className}
    />
  );
}
