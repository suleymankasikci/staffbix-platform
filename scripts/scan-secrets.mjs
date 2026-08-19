import { execFileSync } from "node:child_process";
import fs from "node:fs";

/**
 * Fail the build if a credential-shaped string reached a tracked file.
 *
 * GitHub's own push protection runs *after* you push and only covers
 * providers it has partnered with. This runs before the commit lands and
 * covers the specific keys this project handles. Belt and braces — a
 * leaked key is not a bug you get to fix by reverting, because it is
 * public the moment it is pushed.
 *
 * Scans `git ls-files`, so anything ignored (.env.local) is out of scope
 * by construction — the point is to catch a secret someone accidentally
 * *tracked*.
 *
 * Run: `npm run scan:secrets`
 */

const PATTERNS = [
  // OpenAI / Anthropic. The `[A-Za-z0-9]` anchor after the prefix keeps
  // placeholders like `sk-build-placeholder` and `sk_test_…` out.
  [/\bsk-(?:proj-|ant-)?[A-Za-z0-9]{20,}\b/, "OpenAI/Anthropic API key"],
  [/\bAKIA[0-9A-Z]{16}\b/, "AWS access key id"],
  [/\bASIA[0-9A-Z]{16}\b/, "AWS temporary access key id"],
  [/\bghp_[A-Za-z0-9]{36}\b/, "GitHub personal access token"],
  [/\bgho_[A-Za-z0-9]{36}\b/, "GitHub OAuth token"],
  [/\bgithub_pat_[A-Za-z0-9_]{50,}\b/, "GitHub fine-grained PAT"],
  [/\bxox[baprs]-[A-Za-z0-9-]{20,}\b/, "Slack token"],
  [/\bAIza[0-9A-Za-z_-]{35}\b/, "Google API key"],
  [/\bre_[A-Za-z0-9]{24,}\b/, "Resend API key"],
  [/\bsk_live_[A-Za-z0-9]{20,}\b/, "Stripe live secret key"],
  [/\brk_live_[A-Za-z0-9]{20,}\b/, "Stripe live restricted key"],
  [/\bwhsec_[A-Za-z0-9]{24,}\b/, "Stripe webhook signing secret"],
  [/-----BEGIN (?:RSA |EC |OPENSSH |PGP )?PRIVATE KEY-----/, "private key block"],
  [/\beyJ[A-Za-z0-9_-]{20,}\.[A-Za-z0-9_-]{20,}\.[A-Za-z0-9_-]{20,}\b/, "JWT"],
  // Connection strings carrying real credentials. Localhost is exempt
  // below — CI and .env.example both use postgres:postgres@localhost.
  [
    /\b(?:postgres(?:ql)?|redis|rediss|mongodb(?:\+srv)?|amqps?):\/\/[^\s:/@"'`]+:[^\s@"'`]+@[^\s"'`/]+/,
    "connection string with credentials",
  ],
];

/**
 * Hosts that are never a real target. A credentialed URL pointing at one
 * of these is a fixture, not a leak.
 */
const LOCAL_HOSTS = /@(?:localhost|127\.0\.0\.1|::1|0\.0\.0\.0|host\.docker\.internal|postgres|redis)[:/\s"'`]/;

/** Binary and generated files where a match would be noise, not signal. */
const SKIP = [
  /^package-lock\.json$/,
  /\.(png|jpe?g|gif|webp|ico|svg|pdf|pptx|docx|woff2?|ttf|eot|zip|gz)$/i,
];

function trackedFiles() {
  return execFileSync("git", ["ls-files", "-z"], { maxBuffer: 64 * 1024 * 1024 })
    .toString("utf8")
    .split("\0")
    .filter(Boolean);
}

const findings = [];

for (const file of trackedFiles()) {
  if (SKIP.some((re) => re.test(file))) continue;
  let text;
  try {
    text = fs.readFileSync(file, "utf8");
  } catch {
    continue;
  }
  // Cheap binary guard — a NUL byte means this is not source.
  if (text.includes("\0")) continue;

  const lines = text.split(/\r?\n/);
  for (const [label, re] of PATTERNS.map(([r, l]) => [l, r])) {
    for (let i = 0; i < lines.length; i++) {
      const m = re.exec(lines[i]);
      if (!m) continue;
      if (LOCAL_HOSTS.test(m[0] + " ")) continue;
      findings.push({
        file,
        line: i + 1,
        kind: label,
        // Never print the secret itself — a CI log is not a safe place
        // to reproduce one. Prefix and length are enough to locate it.
        preview: `${m[0].slice(0, 6)}… (${m[0].length} chars)`,
      });
    }
  }
}

if (findings.length === 0) {
  console.log("scan-secrets: clean — no credential-shaped strings in tracked files.");
  process.exit(0);
}

console.error(`scan-secrets: ${findings.length} potential secret(s) in tracked files:\n`);
for (const f of findings) {
  console.error(`  ${f.file}:${f.line}  ${f.kind}  ${f.preview}`);
}
console.error(
  "\nIf one of these is a placeholder, make it obviously fake (e.g. `sk-build-placeholder`).",
);
console.error("If any is real: rotate it first, then remove it from history.");
process.exit(1);
