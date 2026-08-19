/**
 * Localized copy for every user-facing system email. English is the single
 * source of truth here; the other 22 locales are machine-translated into
 * `copy.generated.ts` by `scripts/translate-mail-copy.mts`.
 *
 * `{placeholders}` are interpolated at send time via `fill()`. Brand terms
 * (Staffbix, Brand Bible, Approval Center) are preserved by the translator.
 */
import type { Locale } from "@/lib/i18n/config";
import { GENERATED_MAIL_COPY } from "./copy.generated";

export interface MailCopy {
  otp: {
    subjectSignup: string;
    subjectLogin: string;
    preheader: string;
    headingSignup: string;
    headingLogin: string;
    intro: string;
    expiry: string; // {min}
    security: string;
    footerNote: string;
  };
  invitation: {
    subject: string; // {inviter} {tenant}
    preheader: string; // {tenant}
    heading: string; // {tenant}
    intro: string; // {inviter} {tenant} {role}
    cta: string;
    pasteNote: string;
    expiry: string; // {days}
    footerNote: string;
  };
  drip: {
    greetingNamed: string; // {name}
    greetingPlain: string;
    ctaDashboard: string;
    ctaQuickstart: string;
    ctaHire: string;
    ctaAddSource: string;
    d1: { subject: string; preheader: string; heading: string; p1: string; p2: string; unsub: string };
    d2: { subject: string; preheader: string; heading: string; intro: string; steps: string[]; walkthrough: string };
    d3: { subject: string; preheader: string; heading: string; p1: string; p2: string; reply: string };
    d4: { subject: string; preheader: string; heading: string; p1: string; intro: string; items: string[]; more: string };
    d5: { subject: string; preheader: string; heading: string; p1: string; intro: string; items: string[]; thanks: string };
  };
}

export const EN_COPY: MailCopy = {
  otp: {
    subjectSignup: "Confirm your email — code {code}",
    subjectLogin: "Your Staffbix sign-in code: {code}",
    preheader: "Your one-time code expires in {min} minutes.",
    headingSignup: "Confirm your email",
    headingLogin: "Your sign-in code",
    intro: "Enter this code in the Staffbix tab to continue.",
    expiry: "It expires in {min} minutes and is good for one use.",
    security: "If you didn't request this, you can safely ignore this email — your account stays protected.",
    footerNote: "This is an automated security message from Staffbix.",
  },
  invitation: {
    subject: "{inviter} invited you to {tenant} on Staffbix",
    preheader: "Join {tenant} on Staffbix.",
    heading: "You're invited to {tenant}",
    intro: "{inviter} has invited you to join {tenant} on Staffbix as a {role}.",
    cta: "Accept invitation",
    pasteNote: "Or paste this link into your browser:",
    expiry: "This invitation expires in {days} days. If you weren't expecting it, you can ignore this email.",
    footerNote: "You received this because someone invited you to a Staffbix workspace.",
  },
  drip: {
    greetingNamed: "Hi {name},",
    greetingPlain: "Hi,",
    ctaDashboard: "Open your dashboard",
    ctaQuickstart: "See the quickstart",
    ctaHire: "Hire a worker",
    ctaAddSource: "Add a source",
    d1: {
      subject: "Welcome to Staffbix",
      preheader: "Your trial just started — here's where to begin.",
      heading: "Welcome aboard",
      p1: "Your workspace is ready and your trial just started.",
      p2: "Staffbix gives you one shared brain (the Brand Bible), one set of AI workers, and one approvals queue between you and the outside world. The dashboard is the right place to start.",
      unsub: "We'll send four more short notes over the next two weeks, each focused on the next thing worth trying. Reply with the word stop to unsubscribe anytime.",
    },
    d2: {
      subject: "The 5-step Staffbix quickstart",
      preheader: "The fastest way to see Staffbix earn its keep.",
      heading: "The 5-step quickstart",
      intro: "If you haven't poked around yet, the fastest way to see Staffbix earn its keep is the five-step quickstart:",
      steps: [
        "Upload one Brand Bible source.",
        "Hire your first AI worker.",
        "Drop the chat widget into a page you own.",
        "Watch a message arrive in Conversations.",
        "Approve your first reply.",
      ],
      walkthrough: "The full walkthrough is in the docs.",
    },
    d3: {
      subject: "Have you hired your first worker yet?",
      preheader: "Customer Support is the most forgiving first hire.",
      heading: "Hire your first worker",
      p1: "It's been a few days. If you haven't hired your first AI worker yet, today is a good day for it.",
      p2: "Customer Support is the most forgiving role — your first hire will draft replies the same afternoon, and you stay in control because every send goes through Approvals until you decide to switch a channel to auto.",
      reply: "Reply to this email if anything is in the way — we read every reply.",
    },
    d4: {
      subject: "Feed your workers context with the Brand Bible",
      preheader: "The single biggest lever on reply quality.",
      heading: "Feed your workers context",
      p1: "One week in. The single biggest lever on reply quality is the Brand Bible — the corpus of writing your AI workers retrieve from before drafting anything.",
      intro: "Today, take five minutes to upload one more source:",
      items: [
        "A sample of your three best customer emails.",
        "A recent sales-call transcript that closed.",
        "A blog post you're proud of.",
      ],
      more: "More on what to upload (and what to leave out) is in the docs.",
    },
    d5: {
      subject: "Two weeks in — how's it going?",
      preheader: "One sentence of feedback shapes the next sprint.",
      heading: "How's it going?",
      p1: "You've been with Staffbix for two weeks. The honest question: is it pulling its weight?",
      intro: "Reply to this email with one sentence. Good, bad, neutral — every reply gets read by the founding team and shapes the next sprint. We're especially curious about:",
      items: [
        "Did approvals feel like a useful gate or an annoying one?",
        "Were your workers grounded in your voice, or generic?",
        "What single feature would you add tomorrow?",
      ],
      thanks: "Thank you for trying it.",
    },
  },
};

/** Interpolate {key} placeholders. Missing keys are left as-is. */
export function fill(template: string, vars: Record<string, string | number>): string {
  return template.replace(/\{(\w+)\}/g, (m, k) => (k in vars ? String(vars[k]) : m));
}

/** Resolve the copy for a locale: English source, else machine-translated. */
export function getMailCopy(locale: Locale): MailCopy {
  if (locale === "en") return EN_COPY;
  return GENERATED_MAIL_COPY[locale] ?? EN_COPY;
}
