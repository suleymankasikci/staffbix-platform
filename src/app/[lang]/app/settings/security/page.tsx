"use client";

import { useEffect, useState } from "react";
import { PageShell, Card, SectionTitle, Badge } from "@/components/app/PageShell";
import { SettingsNav } from "@/components/app/SettingsNav";
import { ConfirmModal } from "@/components/app/ConfirmModal";
import { PasswordField } from "@/components/PasswordField";
import { IconClose } from "@/components/Icons";
import { useLocale } from "@/lib/i18n/client";
import { getAppSettingsSecurityCopy } from "@/lib/i18n/page-copy";

type Session = {
  id: string;
  device: string;
  ip: string;
  location: string;
  lastActive: string;
  current?: boolean;
};

// Sprint 18 — TOTP UI. Talks to /api/me/totp/{enroll,verify,disable}.
type EnrollPayload = {
  secret_base32: string;
  otpauth_uri: string;
  recovery_codes: string[];
};
type TotpStatus = { enrolled: boolean };

export default function SecuritySettingsPage() {
  const locale = useLocale();
  const copy = getAppSettingsSecurityCopy(locale);
  const [sessions, setSessions] = useState<Session[]>(() =>
    copy.sessions.rows.map((s) => ({ ...s }))
  );
  const [revokeId, setRevokeId] = useState<string | null>(null);
  const [revokeAll, setRevokeAll] = useState(false);

  // ── TOTP state ──────────────────────────────────────────────────────
  const [totp, setTotp] = useState<TotpStatus | null>(null);
  const [totpBusy, setTotpBusy] = useState(false);
  const [totpError, setTotpError] = useState<string | null>(null);
  const [enrollPayload, setEnrollPayload] = useState<EnrollPayload | null>(null);
  const [enrollCode, setEnrollCode] = useState("");
  const [disableOpen, setDisableOpen] = useState(false);
  const [disablePassword, setDisablePassword] = useState("");

  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        const res = await fetch("/api/me", { cache: "no-store" });
        if (!res.ok) return;
        const body = (await res.json().catch(() => null)) as
          | { user?: { totpEnrolledAt?: string | null } }
          | null;
        if (cancelled) return;
        setTotp({ enrolled: Boolean(body?.user?.totpEnrolledAt) });
      } catch {
        /* keep null — UI shows neutral state */
      }
    })();
    return () => {
      cancelled = true;
    };
  }, []);

  async function startEnroll() {
    setTotpBusy(true);
    setTotpError(null);
    try {
      const res = await fetch("/api/me/totp/enroll", { method: "POST" });
      const body = (await res.json().catch(() => ({}))) as
        | (EnrollPayload & { ok: true })
        | { error?: string };
      if (!res.ok) {
        setTotpError(("error" in body && body.error) || "Could not start enrolment.");
        return;
      }
      setEnrollPayload(body as EnrollPayload);
      setEnrollCode("");
    } catch {
      setTotpError("Network error starting enrolment.");
    } finally {
      setTotpBusy(false);
    }
  }

  async function confirmEnroll() {
    if (!/^\d{6}$/.test(enrollCode)) {
      setTotpError("Enter the 6-digit code from your authenticator app.");
      return;
    }
    setTotpBusy(true);
    setTotpError(null);
    try {
      const res = await fetch("/api/me/totp/verify", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ code: enrollCode }),
      });
      const body = (await res.json().catch(() => ({}))) as { error?: string };
      if (!res.ok) {
        setTotpError(body.error ?? "Code did not match.");
        return;
      }
      setEnrollPayload(null);
      setEnrollCode("");
      setTotp({ enrolled: true });
    } catch {
      setTotpError("Network error verifying code.");
    } finally {
      setTotpBusy(false);
    }
  }

  async function doDisable() {
    if (!disablePassword) {
      setTotpError("Password is required.");
      return;
    }
    setTotpBusy(true);
    setTotpError(null);
    try {
      const res = await fetch("/api/me/totp/disable", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ password: disablePassword }),
      });
      const body = (await res.json().catch(() => ({}))) as { error?: string };
      if (!res.ok) {
        setTotpError(body.error ?? "Could not disable TOTP.");
        return;
      }
      setDisableOpen(false);
      setDisablePassword("");
      setTotp({ enrolled: false });
    } catch {
      setTotpError("Network error disabling TOTP.");
    } finally {
      setTotpBusy(false);
    }
  }

  function doRevoke() {
    if (!revokeId) return;
    setSessions((ss) => ss.filter((s) => s.id !== revokeId));
    setRevokeId(null);
  }

  function doRevokeAll() {
    setSessions((ss) => ss.filter((s) => s.current));
    setRevokeAll(false);
  }

  const totpEnrolled = totp?.enrolled === true;

  return (
    <PageShell title={copy.title} description={copy.description}>
      <SettingsNav />

      <div className="flex flex-col gap-5 max-w-[840px]">
        <Card>
          <SectionTitle
            label={copy.password.title}
            description={copy.password.description}
          />
          <form className="flex flex-col gap-5 max-w-[400px]">
            <PasswordField
              label={copy.password.current}
              name="current"
              autoComplete="current-password"
              placeholder={copy.password.hiddenPlaceholder}
              showPasswordLabel={copy.password.show}
              hidePasswordLabel={copy.password.hide}
            />
            <PasswordField
              label={copy.password.new}
              name="new"
              autoComplete="new-password"
              placeholder={copy.password.newPlaceholder}
              showPasswordLabel={copy.password.show}
              hidePasswordLabel={copy.password.hide}
            />
            <PasswordField
              label={copy.password.confirm}
              name="confirm"
              autoComplete="new-password"
              placeholder={copy.password.confirmPlaceholder}
              showPasswordLabel={copy.password.show}
              hidePasswordLabel={copy.password.hide}
            />
            <button
              type="submit"
              className="self-start mt-2 inline-flex items-center text-[13px] font-medium px-4 py-2 rounded-full bg-ink text-white hover:bg-ink/85 transition-colors"
            >
              {copy.password.update}
            </button>
          </form>
          <p className="mt-5 font-mono text-[10px] uppercase tracking-[0.12em] text-ink-soft">
            {copy.password.notice}
          </p>
        </Card>

        <Card>
          <SectionTitle
            label={copy.twoFactor.title}
            description={copy.twoFactor.description}
          />
          {totpError && (
            <div className="mb-3 text-[12.5px] text-[#B91C1C] bg-[#FEE2E2] border border-[#B91C1C]/25 rounded-md px-3 py-2">
              {totpError}
            </div>
          )}
          <div className="flex items-center justify-between border border-rule rounded-md px-4 py-3 mb-3">
            <div>
              <p className="text-[13px] font-medium text-ink">
                {copy.twoFactor.emailTitle}
              </p>
              <p className="text-[12px] text-ink-muted">
                {copy.twoFactor.emailDescription}
              </p>
            </div>
            <Badge tone="accent">{copy.twoFactor.enabled}</Badge>
          </div>
          <div className="flex items-center justify-between border border-rule rounded-md px-4 py-3">
            <div>
              <p className="text-[13px] font-medium text-ink">
                {copy.twoFactor.totpTitle}
              </p>
              <p className="text-[12px] text-ink-muted">
                {copy.twoFactor.totpDescription}
              </p>
            </div>
            {totpEnrolled ? (
              <div className="flex items-center gap-2">
                <Badge tone="accent">{copy.twoFactor.enabled}</Badge>
                <button
                  type="button"
                  onClick={() => {
                    setTotpError(null);
                    setDisableOpen(true);
                  }}
                  disabled={totpBusy}
                  className="inline-flex items-center text-[12.5px] font-medium px-3 py-1.5 rounded-full border border-rule text-[#B91C1C] hover:border-[#B91C1C]/40 hover:bg-[#B91C1C]/5 disabled:opacity-40 transition-colors"
                >
                  Disable
                </button>
              </div>
            ) : (
              <button
                type="button"
                onClick={startEnroll}
                disabled={totpBusy}
                className="inline-flex items-center text-[12.5px] font-medium px-3 py-1.5 rounded-full border border-rule text-ink hover:border-ink/30 disabled:opacity-40 transition-colors"
              >
                {copy.twoFactor.setup}
              </button>
            )}
          </div>
        </Card>

        <Card padded={false}>
          <div className="px-5 pt-5 pb-3 flex items-end justify-between">
            <SectionTitle
              label={copy.sessions.title}
              description={`${sessions.length} ${copy.sessions.activePrefix}`}
            />
            <button
              type="button"
              onClick={() => setRevokeAll(true)}
              className="font-mono text-[10px] uppercase tracking-[0.12em] text-ink-muted hover:text-[#B91C1C] transition-colors"
            >
              {copy.sessions.revokeAll}
            </button>
          </div>
          <ul className="divide-y divide-rule">
            {sessions.map((s) => (
              <li key={s.id} className="px-5 py-4 flex items-center gap-4">
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 mb-1">
                    <p className="text-[13px] font-medium text-ink">
                      {s.device}
                    </p>
                    {s.current && (
                      <Badge tone="accent">{copy.sessions.thisDevice}</Badge>
                    )}
                  </div>
                  <p className="text-[12px] text-ink-muted">
                    {s.location} {copy.sessions.separator} {copy.sessions.ip}{" "}
                    {s.ip} {copy.sessions.separator} {s.lastActive}
                  </p>
                </div>
                {!s.current && (
                  <button
                    type="button"
                    onClick={() => setRevokeId(s.id)}
                    className="text-[12px] font-medium text-[#B91C1C] hover:text-[#991B1B] transition-colors"
                  >
                    {copy.sessions.revoke}
                  </button>
                )}
              </li>
            ))}
          </ul>
        </Card>

        <Card>
          <SectionTitle
            label={copy.securityLog.title}
            description={copy.securityLog.description}
          />
          <ul className="flex flex-col gap-2.5 font-mono text-[11px] uppercase tracking-[0.06em] text-ink-muted">
            {copy.securityLog.rows.map((row) => (
              <li key={row}>{row}</li>
            ))}
          </ul>
        </Card>
      </div>

      <ConfirmModal
        open={Boolean(revokeId)}
        onClose={() => setRevokeId(null)}
        onConfirm={doRevoke}
        title={copy.revokeOne.title}
        confirmLabel={copy.revokeOne.confirm}
        tone="danger"
        body={<p>{copy.revokeOne.body}</p>}
      />

      <ConfirmModal
        open={revokeAll}
        onClose={() => setRevokeAll(false)}
        onConfirm={doRevokeAll}
        title={copy.revokeAll.title}
        confirmLabel={copy.revokeAll.confirm}
        tone="danger"
        body={<p>{copy.revokeAll.body}</p>}
      />

      {enrollPayload && (
        <EnrollModal
          payload={enrollPayload}
          code={enrollCode}
          onCodeChange={setEnrollCode}
          onClose={() => {
            setEnrollPayload(null);
            setEnrollCode("");
            setTotpError(null);
          }}
          onConfirm={confirmEnroll}
          busy={totpBusy}
          error={totpError}
        />
      )}

      {disableOpen && (
        <DisableModal
          password={disablePassword}
          onPasswordChange={setDisablePassword}
          onClose={() => {
            setDisableOpen(false);
            setDisablePassword("");
            setTotpError(null);
          }}
          onConfirm={doDisable}
          busy={totpBusy}
          error={totpError}
        />
      )}
    </PageShell>
  );
}

function EnrollModal({
  payload,
  code,
  onCodeChange,
  onClose,
  onConfirm,
  busy,
  error,
}: {
  payload: EnrollPayload;
  code: string;
  onCodeChange: (v: string) => void;
  onClose: () => void;
  onConfirm: () => void;
  busy: boolean;
  error: string | null;
}) {
  return (
    <div
      role="dialog"
      aria-modal="true"
      className="fixed inset-0 z-50 flex items-center justify-center p-4"
    >
      <button
        type="button"
        onClick={onClose}
        aria-label="Close"
        className="absolute inset-0 bg-ink/30 backdrop-blur-sm"
      />
      <div className="relative bg-card border border-rule rounded-[14px] w-full max-w-[520px] shadow-[0_24px_60px_-20px_rgba(15,23,42,0.25)] max-h-[90vh] overflow-y-auto">
        <header className="px-6 pt-6 pb-3 flex items-start justify-between gap-3">
          <div>
            <p className="font-mono text-[10px] uppercase tracking-[0.14em] text-ink-soft mb-2">
              Authenticator app
            </p>
            <h2 className="text-[18px] font-medium tracking-[-0.01em] text-ink">
              Enable TOTP
            </h2>
          </div>
          <button
            type="button"
            onClick={onClose}
            aria-label="Close"
            className="inline-flex items-center justify-center size-7 rounded-md text-ink-soft hover:text-ink hover:bg-canvas-soft transition-colors"
          >
            <IconClose />
          </button>
        </header>
        <div className="px-6 pb-3 flex flex-col gap-4">
          <p className="text-[13px] text-ink-muted">
            Open your authenticator app (Google Authenticator, Authy, 1Password,
            Bitwarden, …) and add a new account using the URI or secret below.
          </p>
          <div>
            <p className="font-mono text-[10px] uppercase tracking-[0.1em] text-ink-soft mb-1.5">
              Secret (base32)
            </p>
            <code className="block font-mono text-[12px] text-ink bg-canvas-soft border border-rule rounded-md px-3 py-2 break-all">
              {payload.secret_base32}
            </code>
          </div>
          <div>
            <p className="font-mono text-[10px] uppercase tracking-[0.1em] text-ink-soft mb-1.5">
              otpauth URI (paste into apps that support it)
            </p>
            <textarea
              readOnly
              value={payload.otpauth_uri}
              className="w-full font-mono text-[11.5px] text-ink bg-canvas-soft border border-rule rounded-md px-3 py-2 break-all resize-none h-[64px]"
            />
          </div>
          <div>
            <p className="font-mono text-[10px] uppercase tracking-[0.1em] text-ink-soft mb-1.5">
              Recovery codes — save these now
            </p>
            <ul className="grid grid-cols-2 gap-1.5 font-mono text-[12px] text-ink bg-canvas-soft border border-rule rounded-md px-3 py-2">
              {payload.recovery_codes.map((c) => (
                <li key={c}>{c}</li>
              ))}
            </ul>
            <p className="font-mono text-[10px] uppercase tracking-[0.1em] text-ink-soft mt-2">
              Each code works exactly once if you lose your device.
            </p>
          </div>
          <div>
            <label className="font-mono text-[10px] uppercase tracking-[0.1em] text-ink-soft block mb-1.5">
              Enter the 6-digit code from your app
            </label>
            <input
              type="text"
              inputMode="numeric"
              pattern="\d{6}"
              maxLength={6}
              value={code}
              onChange={(e) => onCodeChange(e.target.value.replace(/\D/g, ""))}
              className="w-[140px] font-mono text-[16px] tracking-[0.2em] text-ink bg-canvas border border-rule rounded-md px-3 py-2 focus:border-ink/40 outline-none"
              placeholder="000000"
            />
          </div>
          {error && (
            <p className="text-[12.5px] text-[#B91C1C] bg-[#FEE2E2] border border-[#B91C1C]/25 rounded-md px-3 py-2">
              {error}
            </p>
          )}
        </div>
        <footer className="px-6 py-4 border-t border-rule bg-canvas-soft/60 rounded-b-[14px] flex items-center justify-end gap-2">
          <button
            type="button"
            onClick={onClose}
            className="inline-flex items-center text-[13px] font-medium px-4 py-2 rounded-full border border-rule text-ink hover:border-ink/30 transition-colors"
          >
            Cancel
          </button>
          <button
            type="button"
            disabled={busy || code.length !== 6}
            onClick={onConfirm}
            className="inline-flex items-center text-[13px] font-medium px-4 py-2 rounded-full bg-ink text-white hover:bg-ink/85 disabled:opacity-40 transition-colors"
          >
            {busy ? "Verifying…" : "Verify & enable"}
          </button>
        </footer>
      </div>
    </div>
  );
}

function DisableModal({
  password,
  onPasswordChange,
  onClose,
  onConfirm,
  busy,
  error,
}: {
  password: string;
  onPasswordChange: (v: string) => void;
  onClose: () => void;
  onConfirm: () => void;
  busy: boolean;
  error: string | null;
}) {
  return (
    <div
      role="dialog"
      aria-modal="true"
      className="fixed inset-0 z-50 flex items-center justify-center p-4"
    >
      <button
        type="button"
        onClick={onClose}
        aria-label="Close"
        className="absolute inset-0 bg-ink/30 backdrop-blur-sm"
      />
      <div className="relative bg-card border border-rule rounded-[14px] w-full max-w-[440px] shadow-[0_24px_60px_-20px_rgba(15,23,42,0.25)]">
        <header className="px-6 pt-6 pb-3 flex items-start justify-between gap-3">
          <div>
            <p className="font-mono text-[10px] uppercase tracking-[0.14em] text-ink-soft mb-2">
              Two-factor
            </p>
            <h2 className="text-[18px] font-medium tracking-[-0.01em] text-ink">
              Disable TOTP
            </h2>
          </div>
          <button
            type="button"
            onClick={onClose}
            aria-label="Close"
            className="inline-flex items-center justify-center size-7 rounded-md text-ink-soft hover:text-ink hover:bg-canvas-soft transition-colors"
          >
            <IconClose />
          </button>
        </header>
        <div className="px-6 pb-3 flex flex-col gap-3">
          <p className="text-[13px] text-ink-muted">
            Confirm your password to remove the authenticator-app second factor.
            Email OTP at login will continue to apply.
          </p>
          <PasswordField
            label="Password"
            name="disable-password"
            autoComplete="current-password"
            placeholder="••••••••"
            showPasswordLabel="Show"
            hidePasswordLabel="Hide"
            value={password}
            onChange={(e) => onPasswordChange(e.target.value)}
          />
          {error && (
            <p className="text-[12.5px] text-[#B91C1C] bg-[#FEE2E2] border border-[#B91C1C]/25 rounded-md px-3 py-2">
              {error}
            </p>
          )}
        </div>
        <footer className="px-6 py-4 border-t border-rule bg-canvas-soft/60 rounded-b-[14px] flex items-center justify-end gap-2">
          <button
            type="button"
            onClick={onClose}
            className="inline-flex items-center text-[13px] font-medium px-4 py-2 rounded-full border border-rule text-ink hover:border-ink/30 transition-colors"
          >
            Cancel
          </button>
          <button
            type="button"
            disabled={busy || !password}
            onClick={onConfirm}
            className="inline-flex items-center text-[13px] font-medium px-4 py-2 rounded-full bg-[#B91C1C] text-white hover:bg-[#991B1B] disabled:opacity-40 transition-colors"
          >
            {busy ? "Disabling…" : "Disable TOTP"}
          </button>
        </footer>
      </div>
    </div>
  );
}
