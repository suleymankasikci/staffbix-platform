"use client";

import { useState, type ChangeEvent } from "react";

/**
 * Hard rules mirrored from `lib/auth/password.ts`. Keep them in sync —
 * if you change the server-side floor / ceiling, change these too.
 */
export const PASSWORD_MIN = 12;
export const PASSWORD_MAX = 256;

export type PasswordStrengthState = "empty" | "tooShort" | "tooLong" | "ok";

/**
 * Pure server-rule check. Returns "ok" iff the password matches what
 * `hashPassword` will accept. The signup form uses this to gate submit
 * and to drive the colored under-input bar.
 */
export function evaluatePasswordStrength(value: string): PasswordStrengthState {
  if (value.length === 0) return "empty";
  if (value.length < PASSWORD_MIN) return "tooShort";
  if (value.length > PASSWORD_MAX) return "tooLong";
  return "ok";
}

type StrengthLabels = {
  tooShort: string;
  tooLong: string;
  valid: string;
  /** Optional counter like "{count} / 12 characters". */
  progress?: string;
};

type Props = {
  label: string;
  name: string;
  placeholder?: string;
  autoComplete?: string;
  hint?: string;
  required?: boolean;
  rightSlot?: React.ReactNode;
  defaultValue?: string;
  value?: string;
  onChange?: (e: ChangeEvent<HTMLInputElement>) => void;
  showPasswordLabel?: string;
  hidePasswordLabel?: string;
  /**
   * When true, renders a strength bar + status text beneath the input.
   * The component reads `value` to compute state, so callers must pass
   * a controlled value (uncontrolled `defaultValue` won't update the
   * meter on each keystroke).
   */
  showStrength?: boolean;
  strengthLabels?: StrengthLabels;
};

export function PasswordField({
  label,
  name,
  placeholder,
  autoComplete,
  hint,
  required,
  rightSlot,
  defaultValue,
  value,
  onChange,
  showPasswordLabel = "Show password",
  hidePasswordLabel = "Hide password",
  showStrength = false,
  strengthLabels,
}: Props) {
  const [visible, setVisible] = useState(false);

  const strength = showStrength
    ? evaluatePasswordStrength(value ?? defaultValue ?? "")
    : "empty";
  const showMeter = showStrength && strength !== "empty";
  const isOk = strength === "ok";
  const meterClass = isOk
    ? "bg-[#15803D]" // green
    : "bg-[#B91C1C]"; // red
  const meterTextClass = isOk
    ? "text-[#15803D]"
    : "text-[#B91C1C]";
  const meterText = (() => {
    if (!strengthLabels) return "";
    switch (strength) {
      case "tooShort":
        if (strengthLabels.progress) {
          const count = (value ?? defaultValue ?? "").length;
          return `${strengthLabels.tooShort} (${strengthLabels.progress.replace(
            "{count}",
            String(count),
          )})`;
        }
        return strengthLabels.tooShort;
      case "tooLong":
        return strengthLabels.tooLong;
      case "ok":
        return strengthLabels.valid;
      default:
        return "";
    }
  })();

  return (
    <label className="flex flex-col gap-2">
      <div className="flex items-center justify-between">
        <span className="font-mono text-[10px] uppercase tracking-[0.14em] text-ink-soft">
          {label}
        </span>
        {rightSlot}
      </div>
      <div className="relative flex items-center border-b border-rule focus-within:border-ink transition-colors">
        <input
          type={visible ? "text" : "password"}
          name={name}
          placeholder={placeholder}
          autoComplete={autoComplete}
          required={required}
          defaultValue={defaultValue}
          value={value}
          onChange={onChange}
          aria-invalid={showMeter && !isOk ? true : undefined}
          aria-describedby={showMeter ? `${name}-strength` : undefined}
          className="flex-1 min-w-0 bg-transparent text-[14px] text-ink py-2 pr-10 border-0 focus:outline-none placeholder:text-ink-soft"
        />
        <button
          type="button"
          onClick={() => setVisible((v) => !v)}
          aria-label={visible ? hidePasswordLabel : showPasswordLabel}
          aria-pressed={visible}
          className="absolute right-0 inline-flex items-center justify-center size-8 -mr-1 text-ink-soft hover:text-ink transition-colors rounded"
        >
          {visible ? <EyeOffIcon /> : <EyeIcon />}
        </button>
      </div>

      {showMeter && (
        <>
          <div
            aria-hidden
            className={`h-[2px] w-full rounded-full transition-colors ${meterClass}`}
          />
          <span
            id={`${name}-strength`}
            role={isOk ? undefined : "alert"}
            aria-live="polite"
            className={`text-[11.5px] leading-[1.5] ${meterTextClass}`}
          >
            {meterText}
          </span>
        </>
      )}

      {hint && (
        <span className="text-[11.5px] text-ink-soft leading-[1.5]">
          {hint}
        </span>
      )}
    </label>
  );
}

function EyeIcon() {
  return (
    <svg
      width="16"
      height="16"
      viewBox="0 0 24 24"
      fill="none"
      aria-hidden
    >
      <path
        d="M2 12s3.5-7 10-7 10 7 10 7-3.5 7-10 7-10-7-10-7z"
        stroke="currentColor"
        strokeWidth="1.5"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
      <circle
        cx="12"
        cy="12"
        r="3"
        stroke="currentColor"
        strokeWidth="1.5"
      />
    </svg>
  );
}

function EyeOffIcon() {
  return (
    <svg
      width="16"
      height="16"
      viewBox="0 0 24 24"
      fill="none"
      aria-hidden
    >
      <path
        d="M9.88 4.24A10.93 10.93 0 0 1 12 4c6.5 0 10 7 10 7a16.6 16.6 0 0 1-2.36 3.31m-3.32 2.48A10.94 10.94 0 0 1 12 18c-6.5 0-10-7-10-7a16.6 16.6 0 0 1 4.59-5.06"
        stroke="currentColor"
        strokeWidth="1.5"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
      <path
        d="M9.88 9.88a3 3 0 0 0 4.24 4.24"
        stroke="currentColor"
        strokeWidth="1.5"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
      <line
        x1="3"
        y1="3"
        x2="21"
        y2="21"
        stroke="currentColor"
        strokeWidth="1.5"
        strokeLinecap="round"
      />
    </svg>
  );
}
