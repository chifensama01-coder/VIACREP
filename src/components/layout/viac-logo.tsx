import Image from "next/image";
import { cn } from "@/lib/utils";

/**
 * The VIAC mark, cropped out of the letterhead banner.
 *
 * `viac_header.png` is a full-width band: the logo sits in the left ~31%, the
 * rest is the contact block. Shrinking the whole band to fit a sidebar makes
 * the contact details an illegible smudge, so the wrapper clips to the logo and
 * the image is scaled up behind it. Using the letterhead itself means there is
 * still only one brand asset to swap.
 */

/** Fraction of the banner width occupied by the logo lockup. */
const LOGO_FRACTION = 0.315;
const BANNER_ASPECT = 310 / 1390;

export function ViacLogo({
  height = 44,
  className,
  priority,
}: {
  height?: number;
  className?: string;
  priority?: boolean;
}) {
  const bannerWidth = height / BANNER_ASPECT;
  const width = bannerWidth * LOGO_FRACTION;

  return (
    <span
      className={cn("relative block overflow-hidden", className)}
      style={{ width, height }}
    >
      <Image
        src="/letterhead/viac_header.png"
        alt="Vision in Action Cameroon"
        width={1390}
        height={310}
        priority={priority}
        className="absolute top-0 left-0 max-w-none"
        style={{ width: bannerWidth, height }}
      />
    </span>
  );
}
