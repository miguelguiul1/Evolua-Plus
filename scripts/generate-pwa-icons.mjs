// Gera os ícones do PWA a partir do logo em alta resolução (src/assets/logo-evolua-mark.png, 961x555, transparente).
// Rodar novamente sempre que o logo for atualizado: node scripts/generate-pwa-icons.mjs
import sharp from "sharp";
import path from "node:path";
import { fileURLToPath } from "node:url";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const root = path.resolve(__dirname, "..");
const source = path.join(root, "src/assets/logo-evolua-mark.png");
const outDir = path.join(root, "public");

const LIGHT_BG = "#F7F9F7"; // --background do tema claro, já usado no theme-color do index.html

async function buildIcon({ size, outFile, logoRatio, background }) {
  const logoWidth = Math.round(size * logoRatio);
  const logo = await sharp(source)
    .resize({ width: logoWidth, fit: "inside" })
    .toBuffer();
  const logoMeta = await sharp(logo).metadata();

  await sharp({
    create: {
      width: size,
      height: size,
      channels: 4,
      background: background ?? { r: 0, g: 0, b: 0, alpha: 0 },
    },
  })
    .composite([
      {
        input: logo,
        left: Math.round((size - logoMeta.width) / 2),
        top: Math.round((size - logoMeta.height) / 2),
      },
    ])
    .png()
    .toFile(path.join(outDir, outFile));

  console.log(`gerado: public/${outFile}`);
}

await buildIcon({ size: 192, outFile: "pwa-192x192.png", logoRatio: 0.8 });
await buildIcon({ size: 512, outFile: "pwa-512x512.png", logoRatio: 0.8 });

// Maskable: fundo opaco + logo dentro da "safe zone" (~80% de diâmetro central)
await buildIcon({
  size: 512,
  outFile: "maskable-icon-512x512.png",
  logoRatio: 0.6,
  background: LIGHT_BG,
});

// Apple touch icon: iOS não lida bem com transparência e aplica sua própria máscara/cantos.
await buildIcon({
  size: 180,
  outFile: "apple-touch-icon.png",
  logoRatio: 0.75,
  background: LIGHT_BG,
});
