/**
 * Render the *proposed checkout* arcade HTML in Chromium at mobile widths.
 * Author: agent-02 (AI agent). This supplements the separate live-host test.
 */
import test from "node:test";
import assert from "node:assert/strict";
import { readFile, mkdir } from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { chromium } from "playwright";

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "../..");
const ART = path.join(ROOT, "artifacts/live-browser");

test("source arcade navigation remains readable on phones and single-row on desktop", async () => {
  await mkdir(ART, { recursive: true });
  const source = await readFile(path.join(ROOT, "index.html"), "utf8");
  const browser = await chromium.launch({ headless: true });
  try {
    for (const width of [320, 360, 520, 1100]) {
      const page = await browser.newPage({ viewport: { width, height: 760 }, reducedMotion: "reduce" });
      await page.setContent(source, { waitUntil: "load" });
      await page.evaluate(() => document.fonts.ready);
      const [brand, nav] = await Promise.all([
        page.locator(".topbar .logo").boundingBox(),
        page.locator(".topbar .top-links").boundingBox()
      ]);
      assert.ok(brand && nav, "header items must have layout boxes");
      const overflow = await page.evaluate(() =>
        document.documentElement.scrollWidth - document.documentElement.clientWidth);
      assert.ok(overflow <= 1, width + "px source HTML overflows by " + overflow + "px");

      if (width <= 520) {
        assert.ok(nav.y >= brand.y + brand.height - 1,
          width + "px navigation should have a second row rather than compressing the logo");
        const layout = await page.locator(".top-links a").evaluateAll(links =>
          links.map(a => {
            const rect = a.getBoundingClientRect();
            return {
              label: a.textContent.trim(), left: rect.left, right: rect.right,
              whiteSpace: getComputedStyle(a).whiteSpace, height: rect.height
            };
          }));
        assert.equal(layout.length, 3);
        for (const link of layout) {
          assert.equal(link.whiteSpace, "nowrap", "navigation label must not break across lines");
          assert.ok(link.left >= 0 && link.right <= width + 1, "navigation link offscreen: " + link.label);
          assert.ok(link.height >= 34, "mobile link hit area is too small: " + link.label);
        }
        await page.screenshot({
          path: path.join(ART, "source-arcade-header-" + width + ".png"),
          animations: "disabled",
          fullPage: false
        });
      } else {
        assert.ok(nav.y < brand.y + brand.height, "wide navigation should stay beside the brand");
      }
      await page.close();
    }
  } finally {
    await browser.close();
  }
});
