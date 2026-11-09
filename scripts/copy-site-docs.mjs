import { mkdir, copyFile } from "node:fs/promises";
await mkdir("dist/site/eval", { recursive: true });
await copyFile("eval/RESULTS.md", "dist/site/eval/RESULTS.md");
await copyFile("DATA_LICENSE.md", "dist/site/DATA_LICENSE.md");
await copyFile("LICENSE", "dist/site/LICENSE");
