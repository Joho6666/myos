/**
 * 把 public/icons/myos-icon.svg 光栅化成 512x512 PNG。
 * electron-builder 会自动把它转成 Windows 需要的 .ico。
 */

import { mkdirSync } from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import sharp from "sharp";

const projectRoot = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..", "..");
const source = path.join(projectRoot, "public", "icons", "myos-icon.svg");
const outputDir = path.join(projectRoot, "desktop", "build");
const output = path.join(outputDir, "icon.png");

mkdirSync(outputDir, { recursive: true });

await sharp(source, { density: 384 })
  .resize(512, 512, { fit: "contain", background: { r: 0, g: 0, b: 0, alpha: 0 } })
  .png()
  .toFile(output);

console.log(`[make-icon] 已生成 ${path.relative(projectRoot, output)}`);
