import Image from "next/image";
import type { ReactNode } from "react";
import type { AppImage } from "@/src/config/images";
import { cx } from "./cx";

/** How wide a photo is drawn: the phone column on small screens, the content column above that. */
const SIZES = "(min-width: 768px) 672px, 100vw";

/**
 * A photo from src/config/images.ts, served by next/image in a responsive size.
 * Always muted (see the `photo-muted` utility) and decorative: it adds mood,
 * not information, so it carries an empty alt text.
 */
export function Photo({
  image,
  sizes = SIZES,
  preload,
  className,
}: {
  image: AppImage;
  sizes?: string;
  /** Only for the one photo at the top of a screen. */
  preload?: boolean;
  className?: string;
}) {
  return (
    <Image
      src={image.src}
      alt=""
      fill
      sizes={sizes}
      preload={preload}
      className={cx("photo-muted object-cover", className)}
      style={{ objectPosition: image.focus }}
    />
  );
}

/**
 * Photo at the top of a screen that fades into the canvas. Text goes BELOW
 * the photo, on the fully faded part, never on the picture itself.
 */
export function HeroPhoto({
  image,
  size = "hero",
  children,
}: {
  image: AppImage;
  /** "hero" for the Path and onboarding, "banner" for a lower strip such as the Coach screen. */
  size?: "hero" | "banner";
  children: ReactNode;
}) {
  return (
    <div>
      <div
        className={cx("relative overflow-hidden", size === "hero" ? "h-52" : "h-36")}
        data-hero={size}
      >
        <Photo image={image} preload />
        <div className="to-canvas absolute inset-0 bg-linear-to-b from-transparent from-35% to-90%" />
      </div>
      <div className="relative -mt-8">{children}</div>
    </div>
  );
}

/** Class or session card: photo on top, all text underneath on a white surface. */
export function ClassCard({
  image,
  lead,
  title,
  meta,
  trailing,
  action,
}: {
  image: AppImage;
  /** Small label above the title, e.g. the time. */
  lead: ReactNode;
  title: ReactNode;
  meta?: ReactNode;
  trailing?: ReactNode;
  action?: ReactNode;
}) {
  return (
    <article
      className="rounded-card border-hairline bg-surface shadow-card overflow-hidden border"
      data-class-card
    >
      <div className="relative aspect-[2/1]">
        <Photo image={image} />
      </div>
      <div className="space-y-4 p-5">
        <div className="flex items-start justify-between gap-4">
          <div className="min-w-0">
            <span className="type-label text-secondary">{lead}</span>
            <p className="type-heading text-title mt-1">{title}</p>
            {meta ? <p className="text-small text-secondary mt-0.5">{meta}</p> : null}
          </div>
          {trailing ? <span className="text-small text-secondary shrink-0">{trailing}</span> : null}
        </div>
        {action}
      </div>
    </article>
  );
}

/** Empty state on a very quiet texture. The texture is faded so the text stays readable. */
export function TextureEmpty({ image, children }: { image: AppImage; children: ReactNode }) {
  return (
    <div className="rounded-card border-hairline relative overflow-hidden border" data-texture>
      <Photo image={image} className="photo-texture" />
      <div className="relative p-6 text-center">{children}</div>
    </div>
  );
}
