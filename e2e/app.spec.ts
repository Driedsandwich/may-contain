import { test, expect, type Page } from "@playwright/test";
import AxeBuilder from "@axe-core/playwright";
import { mkdir } from "node:fs/promises";
const safety =
  "Not found does not mean safe. Always check the package and ask staff. If you have a severe allergy, follow your doctor's plan.";
const results = (page: Page) => page.locator(".results-section");
async function paste(page: Page, text: string, language = "en") {
  await page.getByRole("button", { name: "Paste text", exact: true }).click();
  await page
    .getByLabel("Label language", { exact: true })
    .selectOption(language);
  await page.getByLabel("Ingredient text", { exact: false }).fill(text);
  await page
    .getByRole("button", { name: "Check this text", exact: true })
    .click();
}
async function screenshot(page: Page, name: string, fullPage = true) {
  if (!process.env.UI_ARTIFACT_DIR) return;
  await mkdir(process.env.UI_ARTIFACT_DIR, { recursive: true });
  await page.screenshot({
    path: `${process.env.UI_ARTIFACT_DIR}/${name}.png`,
    fullPage,
  });
}
test("390px: demo evidence, keyboard dialog, language switch and landscape card", async ({
  page,
}) => {
  await page.setViewportSize({ width: 390, height: 844 });
  await page.goto("./");
  await expect(results(page).locator(".status-badge")).toHaveText([
    "●Contains",
    "▲May contain",
    "−Not found in this text",
  ]);
  await expect(results(page).locator("mark")).toHaveText([
    "lait",
    "arachides",
    "milk",
    "peanuts",
  ]);
  await expect(page.locator(".safety").first()).toHaveText(safety);
  await expect(page.locator("body")).toHaveJSProperty("scrollWidth", 390);
  await page.evaluate(() => document.fonts.ready);
  await screenshot(page, "mobile-390");
  expect(
    (
      await new AxeBuilder({ page })
        .withTags(["wcag2a", "wcag2aa", "wcag21aa"])
        .analyze()
    ).violations,
  ).toEqual([]);
  await page.getByRole("button", { name: "Edit allergens" }).focus();
  await page.keyboard.press("Enter");
  await expect(page.getByRole("dialog")).toBeVisible();
  await page.keyboard.press("Escape");
  await expect(
    page.getByRole("button", { name: "Edit allergens" }),
  ).toBeFocused();
  const original = await results(page).textContent();
  for (const lang of ["en", "ja", "fr", "de", "es", "it", "ko", "zh"]) {
    await page.getByLabel("All staff card languages").selectOption(lang);
    await expect(page.locator(".staff-card .staff-words")).toHaveAttribute(
      "lang",
      lang,
    );
    expect(await results(page).textContent()).toBe(original);
  }
  await page.getByLabel("All staff card languages").selectOption("fr");
  await page.setViewportSize({ width: 844, height: 390 });
  await page.getByRole("button", { name: "Show full screen" }).click();
  await expect(page.getByRole("dialog")).toBeVisible();
  await expect(page.getByRole("dialog").locator(".safety")).toHaveText(safety);
  await screenshot(page, "staff-card-landscape", false);
  await page.getByRole("button", { name: "Close Show this to staff" }).click();
  await expect(page.getByRole("dialog")).toHaveCount(0);
});
test("desktop screenshot and accessibility audit", async ({ page }) => {
  await page.setViewportSize({ width: 1440, height: 1000 });
  await page.goto("./");
  await page.evaluate(() => document.fonts.ready);
  await screenshot(page, "desktop-1440");
  expect(
    (
      await new AxeBuilder({ page })
        .withTags(["wcag2a", "wcag2aa", "wcag21aa"])
        .analyze()
    ).violations,
  ).toEqual([]);
  await page.getByRole("button", { name: "Edit allergens" }).click();
  expect(
    (
      await new AxeBuilder({ page })
        .withTags(["wcag2a", "wcag2aa", "wcag21aa"])
        .analyze()
    ).violations,
  ).toEqual([]);
});
test("save is opt-in, reload restores it, delete removes selection and results", async ({
  page,
}) => {
  await page.goto("./");
  expect(await page.evaluate(() => localStorage.length)).toBe(0);
  await page.getByRole("button", { name: "Edit allergens" }).click();
  await page.getByLabel("Eggs", { exact: true }).check();
  await page.getByLabel("Remember my allergens").check();
  await page.getByRole("button", { name: "Done", exact: true }).click();
  await page.reload();
  await expect(page.locator(".profile-strip")).toContainText(
    "Saved on this device",
  );
  await expect(page.locator(".allergen-pills")).toContainText("Eggs");
  await page.getByRole("button", { name: "Edit allergens" }).click();
  await page
    .getByRole("button", { name: "Clear & delete saved allergens" })
    .click();
  expect(await page.evaluate(() => localStorage.length)).toBe(0);
  await page.getByRole("button", { name: "Done", exact: true }).click();
  await expect(results(page).locator(".status-badge")).toHaveCount(0);
  await expect(page.locator(".staff-words")).toContainText(
    "Choose your allergens",
  );
});
test("offline text matching works; unsupported and unreadable text do not produce results", async ({
  page,
  context,
}) => {
  await page.goto("./");
  await context.setOffline(true);
  await paste(page, "Ingredients: milk. May contain peanuts.");
  await expect(results(page).locator(".status-badge")).toHaveText([
    "●Contains",
    "▲May contain",
    "−Not found in this text",
  ]);
  await paste(page, "Ingredients: milk.", "unsupported");
  await expect(page.getByRole("alert")).toContainText("not supported");
  await expect(results(page).locator(".status-badge")).toHaveCount(0);
  await paste(page, "12345", "en");
  await expect(page.getByRole("alert")).toContainText(
    "No readable ingredient text",
  );
  await expect(results(page).locator(".status-badge")).toHaveCount(0);
});
test("OFF retrieval preserves leading zero, source and time; never invents a translation", async ({
  page,
}) => {
  await page.route("https://world.openfoodfacts.org/**", (route) =>
    route.fulfill({
      json: {
        status: 1,
        product: {
          code: "0123456789012",
          product_name: "Fixture product",
          lang: "fr",
          ingredients_text_fr:
            "Ingrédients : lait. Peut contenir des arachides.",
          allergens_tags: ["en:milk"],
          traces_tags: ["en:peanuts"],
        },
      },
    }),
  );
  await page.goto("./");
  await page.getByRole("button", { name: "Barcode", exact: true }).click();
  await page.getByLabel("Barcode number").fill("0123456789012");
  const request = page.waitForRequest("**/product/0123456789012.json?*");
  await page.getByRole("button", { name: "Look up product" }).click();
  expect((await request).headers()["x-user-agent"]).toContain(
    "AllergenTravelCore",
  );
  await expect(
    page.getByLabel("Ingredient text", { exact: false }),
  ).toHaveValue("Ingrédients : lait. Peut contenir des arachides.");
  await page.getByRole("button", { name: "Check this text" }).click();
  await expect(results(page)).toContainText("No verified English translation");
  await expect(results(page)).toContainText(
    "Product data from Open Food Facts (ODbL)",
  );
  await expect(results(page)).toContainText("0123456789012");
  expect(await results(page).locator("time").getAttribute("datetime")).toMatch(
    /^\d{4}-/,
  );
});
for (const scenario of [
  "missing product",
  "missing ingredients",
  "network failure",
]) {
  test(`OFF ${scenario} clears old results and offers text fallback`, async ({
    page,
  }) => {
    await page.route("https://world.openfoodfacts.org/**", (route) =>
      scenario === "network failure"
        ? route.abort()
        : route.fulfill({
            json:
              scenario === "missing product"
                ? { status: 0 }
                : {
                    status: 1,
                    product: { product_name: "Fixture product", lang: "en" },
                  },
          }),
    );
    await page.goto("./");
    await page.getByRole("button", { name: "Barcode", exact: true }).click();
    await page.getByLabel("Barcode number").fill("0123456789012");
    await page.getByRole("button", { name: "Look up product" }).click();
    await expect(page.getByRole("alert")).toContainText(
      scenario === "missing product"
        ? "Product not found"
        : scenario === "missing ingredients"
          ? "ingredient text is missing"
          : "network request failed",
    );
    await expect(results(page).locator(".status-badge")).toHaveCount(0);
    await paste(page, "Ingredients: milk.");
    await expect(results(page).locator(".status-badge").first()).toContainText(
      "Contains",
    );
  });
}
test("camera fallback, blocked storage, and no overflow with all allergens at 320px", async ({
  page,
}) => {
  await page.addInitScript(() => {
    Object.defineProperty(window, "BarcodeDetector", { value: undefined });
    Storage.prototype.setItem = () => {
      throw new Error("Blocked");
    };
  });
  await page.setViewportSize({ width: 320, height: 800 });
  await page.goto("./");
  await page.getByRole("button", { name: "Barcode", exact: true }).click();
  await page.getByRole("button", { name: "Scan barcode with camera" }).click();
  await expect(page.getByRole("alert")).toContainText(
    "Enter the printed number",
  );
  await page.getByRole("button", { name: "Edit allergens" }).click();
  await page.getByLabel("Remember my allergens").click();
  await expect(page.getByRole("dialog")).toContainText(
    "Storage is unavailable",
  );
  for (const box of await page.locator(".allergen-picker input").all())
    await box.check();
  await page.getByRole("button", { name: "Done", exact: true }).click();
  await expect(page.locator("body")).toHaveJSProperty("scrollWidth", 320);
  await expect(results(page).locator(".status-badge")).toHaveCount(20);
});
test("photo draft requires review; OCR failure is separate from not-found", async ({
  page,
}) => {
  await page.route("**/assets/ocr-*.js", (route) =>
    route.fulfill({
      contentType: "application/javascript",
      body: 'export async function readIngredientsPhoto() { return { editableText: "Ingredients: milk. May contain peanuts.", confidence: 88 }; }',
    }),
  );
  await page.goto("./");
  await page.getByRole("button", { name: "Label photo", exact: true }).click();
  await page.getByLabel("Choose a label photo", { exact: true }).setInputFiles({
    name: "synthetic.png",
    mimeType: "image/png",
    buffer: Buffer.from("UI flow stub; real OCR is checked separately"),
  });
  await expect(
    page.getByLabel("Review and correct the extracted text"),
  ).toHaveValue("Ingredients: milk. May contain peanuts.");
  await expect(
    page.getByRole("button", { name: "Check this text" }),
  ).toBeDisabled();
  await expect(results(page).locator(".status-badge")).toHaveCount(0);
  await page.getByLabel("I checked and corrected").check();
  await page.getByRole("button", { name: "Check this text" }).click();
  await expect(results(page)).toContainText("On-device OCR");
  await page
    .getByLabel("Review and correct the extracted text")
    .fill("Ingredients: rice, salt.");
  await expect(
    page.getByRole("button", { name: "Check this text" }),
  ).toBeDisabled();
});
test("unreadable OCR displays an error without allergen states", async ({
  page,
}) => {
  await page.route("**/assets/ocr-*.js", (route) =>
    route.fulfill({
      contentType: "application/javascript",
      body: 'export async function readIngredientsPhoto() { return { editableText: "", confidence: 0 }; }',
    }),
  );
  await page.goto("./");
  await page.getByRole("button", { name: "Label photo", exact: true }).click();
  await page.getByLabel("Choose a label photo", { exact: true }).setInputFiles({
    name: "blank.png",
    mimeType: "image/png",
    buffer: Buffer.from("UI flow stub"),
  });
  await expect(page.getByRole("alert")).toContainText("No readable text");
  await expect(results(page).locator(".status-badge")).toHaveCount(0);
});

test("supported camera captures a number, releases the stream and waits for lookup", async ({
  playwright,
}) => {
  const browser = await playwright.chromium.launch({
    args: [
      "--use-fake-device-for-media-stream",
      "--use-fake-ui-for-media-stream",
    ],
  });
  const context = await browser.newContext({ permissions: ["camera"] });
  const page = await context.newPage();
  try {
    await page.addInitScript(() => {
      const original = navigator.mediaDevices.getUserMedia.bind(
        navigator.mediaDevices,
      );
      navigator.mediaDevices.getUserMedia = async (constraints) => {
        const stream = await original(constraints);
        (window as unknown as { testStream: MediaStream }).testStream = stream;
        return stream;
      };
      Object.defineProperty(window, "BarcodeDetector", {
        value: class {
          static async getSupportedFormats() {
            return ["ean_13"];
          }
          async detect() {
            return [{ rawValue: "0123456789012" }];
          }
        },
      });
    });
    let lookups = 0;
    await page.route("https://world.openfoodfacts.org/**", (route) => {
      lookups++;
      return route.fulfill({ json: { status: 0 } });
    });
    await page.goto("http://127.0.0.1:4173/may-contain/");
    await page.getByRole("button", { name: "Barcode", exact: true }).click();
    await page
      .getByRole("button", { name: "Scan barcode with camera" })
      .click();
    await expect(page.getByLabel("Barcode number")).toHaveValue(
      "0123456789012",
      { timeout: 15000 },
    );
    await expect(page.getByRole("dialog")).toHaveCount(0);
    expect(lookups).toBe(0);
    expect(
      await page.evaluate(() =>
        (window as unknown as { testStream: MediaStream }).testStream
          .getTracks()
          .every((track) => track.readyState === "ended"),
      ),
    ).toBe(true);
    await page.getByRole("button", { name: "Look up product" }).click();
    await expect(page.getByRole("alert")).toContainText("Product not found");
    expect(lookups).toBe(1);
  } finally {
    await browser.close();
  }
});

test("fullscreen fallback remains usable when the browser API is unavailable", async ({
  page,
}) => {
  await page.addInitScript(() => {
    Element.prototype.requestFullscreen =
      undefined as unknown as typeof Element.prototype.requestFullscreen;
  });
  await page.setViewportSize({ width: 390, height: 844 });
  await page.goto("./");
  await page.getByRole("button", { name: "Show full screen" }).click();
  await expect(page.getByRole("dialog")).toBeVisible();
  await page.keyboard.press("Escape");
  await expect(page.getByRole("dialog")).toHaveCount(0);
  await expect(
    page.getByRole("button", { name: "Show full screen" }),
  ).toBeFocused();
});
