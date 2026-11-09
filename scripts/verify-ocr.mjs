// Optional live browser check. Start `npm run preview` first.
// Uses a generated ingredient image; no real person or product data.
import { chromium } from "@playwright/test";
const browser = await chromium.launch({ headless: true });
const requests = [];
try {
  const page = await browser.newPage();
  page.on("request", (request) =>
    requests.push({ method: request.method(), url: request.url() }),
  );
  page.on("pageerror", (error) =>
    console.error("Browser error:", error.message),
  );
  await page.goto("http://127.0.0.1:4173/may-contain/");
  const dataUrl = await page.evaluate(() => {
    const canvas = document.createElement("canvas");
    canvas.width = 1400;
    canvas.height = 260;
    const ctx = canvas.getContext("2d");
    ctx.fillStyle = "white";
    ctx.fillRect(0, 0, canvas.width, canvas.height);
    ctx.fillStyle = "black";
    ctx.font = "48px sans-serif";
    ctx.fillText("Ingredients: oats, milk.", 40, 90);
    ctx.fillText("May contain peanuts.", 40, 180);
    return canvas.toDataURL("image/png");
  });
  await page.getByRole("button", { name: "Label photo", exact: true }).click();
  await page
    .getByLabel("Choose a label photo", { exact: true })
    .setInputFiles({
      name: "synthetic-label.png",
      mimeType: "image/png",
      buffer: Buffer.from(dataUrl.split(",")[1], "base64"),
    });
  const draft = page.getByLabel("Review and correct the extracted text");
  await draft.waitFor({ timeout: 120_000 });
  const text = await draft.inputValue();
  if (!/milk/i.test(text) || !/peanuts/i.test(text))
    throw new Error("OCR did not recover both expected allergen words.");
  await page.getByLabel("I checked and corrected").check();
  await page.getByRole("button", { name: "Check this text" }).click();
  const badges = await page.locator(".status-badge").allTextContents();
  if (!badges[0].includes("Contains") || !badges[1].includes("May contain"))
    throw new Error("Unexpected OCR check states.");
  if (requests.some((request) => request.method !== "GET"))
    throw new Error("Unexpected outbound write request.");
  console.log(
    JSON.stringify(
      {
        result: "passed",
        syntheticOcrText: text,
        badges,
        outboundMethods: [
          ...new Set(requests.map((request) => request.method)),
        ],
        externalHosts: [
          ...new Set(
            requests
              .filter((request) => !request.url.startsWith("http://127.0.0.1"))
              .map((request) => new URL(request.url).host),
          ),
        ],
      },
      null,
      2,
    ),
  );
} finally {
  await browser.close();
}
