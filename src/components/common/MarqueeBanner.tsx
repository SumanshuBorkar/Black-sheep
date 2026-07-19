/**
 * MarqueeBanner — scrolling promo text strip
 *
 * Plain English summary:
 * The continuous scrolling yellow strip with promo text, like
 * "SEE WHAT'S NEW" repeated across the landing page in your Figma.
 * Pure CSS animation (defined in globals.css as --animate-marquee) —
 * no JavaScript needed, so this never blocks the main thread.
 *
 * We duplicate the content once so the loop is seamless — when the
 * first copy scrolls fully out of view, the second copy is exactly
 * where the first one started.
 */

interface MarqueeBannerProps {
  text: string;
}

export function MarqueeBanner({ text }: MarqueeBannerProps) {
  return (
    <div className="marquee-track">
      <div className="marquee-content">
        {Array.from({ length: 8 }).map((_, i) => (
          <span key={i} className="px-6">
            {text}
          </span>
        ))}
      </div>
    </div>
  );
}
