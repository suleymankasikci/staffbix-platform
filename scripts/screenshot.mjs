import { chromium } from "playwright";

const URL = "http://localhost:3002/";
const VIEWPORTS = [
  { name: "mobile", width: 390, height: 844 },
  { name: "tablet", width: 820, height: 1180 },
  { name: "desktop", width: 1440, height: 900 },
];

const browser = await chromium.launch();

for (const vp of VIEWPORTS) {
  const ctx = await browser.newContext({
    viewport: { width: vp.width, height: vp.height },
    deviceScaleFactor: 2,
  });
  const page = await ctx.newPage();
  await page.goto(URL, { waitUntil: "networkidle" });
  await page.waitForTimeout(700);

  // First fold capture, before any scrolling triggers reveals.
  await page.screenshot({
    path: `/tmp/staffbix-${vp.name}-fold.png`,
    fullPage: false,
  });

  // Scroll the page slowly to fire IntersectionObserver on every Reveal,
  // then return to top and let any in-flight transitions finish.
  await page.evaluate(async () => {
    await new Promise((resolve) => {
      let y = 0;
      const step = 220;
      const id = setInterval(() => {
        window.scrollBy(0, step);
        y += step;
        if (y >= document.body.scrollHeight) {
          clearInterval(id);
          resolve(undefined);
        }
      }, 60);
    });
    window.scrollTo(0, 0);
  });
  await page.waitForTimeout(900);

  await page.screenshot({
    path: `/tmp/staffbix-${vp.name}-full.png`,
    fullPage: true,
  });

  console.log(
    `${vp.name.padEnd(8)} ${vp.width}x${vp.height}  ` +
      `→ /tmp/staffbix-${vp.name}-fold.png and -full.png`,
  );
  await ctx.close();
}

await browser.close();
console.log("done.");
