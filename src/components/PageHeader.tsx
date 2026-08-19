import { Reveal } from "./Reveal";

type Props = {
  eyebrow: string;
  title: string;
  sub?: string;
  align?: "center" | "left";
};

export function PageHeader({ eyebrow, title, sub, align = "center" }: Props) {
  const isCenter = align === "center";
  return (
    <section className="pt-10 md:pt-16 pb-12 md:pb-16 border-b border-rule">
      <div className="mx-auto max-w-[1200px] px-6 md:px-10">
        <div
          className={`max-w-[820px] ${isCenter ? "mx-auto text-center" : ""}`}
        >
          <Reveal>
            <p className="font-mono text-[11px] uppercase tracking-[0.14em] text-ink-soft mb-6">
              {eyebrow}
            </p>
          </Reveal>
          <Reveal delay={0.06}>
            <h1 className="text-[clamp(32px,5vw,52px)] font-medium tracking-[-0.025em] leading-[1.06] text-ink mb-5">
              {title}
            </h1>
          </Reveal>
          {sub && (
            <Reveal delay={0.12}>
              <p
                className={`text-[15px] md:text-[16px] text-ink-muted leading-[1.6] max-w-[600px] ${
                  isCenter ? "mx-auto" : ""
                }`}
              >
                {sub}
              </p>
            </Reveal>
          )}
        </div>
      </div>
    </section>
  );
}
