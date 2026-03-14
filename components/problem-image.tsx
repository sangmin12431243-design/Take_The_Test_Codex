"use client";

interface Props {
  src: string | null | undefined;
  alt: string;
  className?: string;
}

export function ProblemImage({ src, alt, className }: Props) {
  if (!src?.trim()) return null;

  return (
    <div className={className}>
      <img
        src={src}
        alt={alt}
        className="max-h-80 w-full rounded-xl border border-slate-200 object-contain bg-slate-50"
      />
    </div>
  );
}
