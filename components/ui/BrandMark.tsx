type BrandMarkProps = {
  size?: number;
  className?: string;
};

export function BrandMark({ size = 24, className = 'brand-logo' }: BrandMarkProps) {
  return (
    <span
      className={className}
      aria-hidden="true"
      style={{ width: size, height: size }}
    >
      <img src="/brand-logo.png" alt="" />
    </span>
  );
}
