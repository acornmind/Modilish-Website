/**
 * Small decorative icon. Uses a plain <img> on purpose: these are tiny static
 * SVGs from the theme's assets/img folder that don't benefit from next/image
 * optimization and otherwise trip its aspect-ratio warning.
 */
export default function Icon({
  src,
  size = 16,
  alt = "",
  className = "",
}: {
  src: string;
  size?: number;
  alt?: string;
  className?: string;
}) {
  return (
    // eslint-disable-next-line @next/next/no-img-element
    <img
      src={src}
      alt={alt}
      width={size}
      height={size}
      style={{ width: size, height: size }}
      className={className}
    />
  );
}
