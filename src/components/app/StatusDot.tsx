import type { HiredWorkerStatus } from "@/lib/hired-workers";

export function StatusDot({
  status,
  withLabel = true,
}: {
  status: HiredWorkerStatus;
  withLabel?: boolean;
}) {
  const color =
    status === "online"
      ? "bg-accent"
      : status === "idle"
      ? "bg-ink-soft"
      : "bg-[#B91C1C]";
  const label =
    status === "online" ? "Online" : status === "idle" ? "Idle" : "Paused";
  const textColor =
    status === "online"
      ? "text-accent"
      : status === "idle"
      ? "text-ink-muted"
      : "text-[#B91C1C]";
  return (
    <span className="inline-flex items-center gap-1.5">
      <span className={`size-[6px] rounded-full ${color}`} />
      {withLabel && (
        <span
          className={`font-mono text-[10px] uppercase tracking-[0.08em] ${textColor}`}
        >
          {label}
        </span>
      )}
    </span>
  );
}
