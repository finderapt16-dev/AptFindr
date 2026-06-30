import { Check } from "lucide-react";

interface VerifiedBadgeProps {
  label?: string;
  showLabel?: boolean;
  className?: string;
}

export function VerifiedBadge({ label = "Verified", showLabel = true, className = "" }: VerifiedBadgeProps) {
  return (
    <span
      className={`inline-flex items-center gap-1.5 rounded-md bg-sky-50 px-2.5 py-1 text-xs font-black text-sky-700 ring-1 ring-sky-100 ${className}`}
      aria-label={label}
      title={label}
    >
      <span
        className="grid h-5 w-5 shrink-0 place-items-center bg-sky-500 text-white shadow-sm shadow-sky-500/30"
        style={{
          clipPath:
            "polygon(50% 0%, 61% 14%, 78% 8%, 85% 25%, 100% 33%, 92% 50%, 100% 67%, 85% 75%, 78% 92%, 61% 86%, 50% 100%, 39% 86%, 22% 92%, 15% 75%, 0% 67%, 8% 50%, 0% 33%, 15% 25%, 22% 8%, 39% 14%)",
        }}
      >
        <Check className="h-3.5 w-3.5 stroke-[4]" />
      </span>
      {showLabel && <span>{label}</span>}
    </span>
  );
}
