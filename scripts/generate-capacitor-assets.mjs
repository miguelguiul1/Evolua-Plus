// Gera as imagens-fonte para o @capacitor/assets (ícone adaptativo + splash) a partir
// do logo em alta resolução (src/assets/logo-evolua-mark.png, 961x555, transparente).
// Rodar de novo sempre que o logo mudar: node scripts/generate-capacitor-assets.mjs
// Depois: npx capacitor-assets generate
import sharp from "sharp";
import path from "node:path";
import { fileURLToPath } from "node:url";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const root = path.resolve(__dirname, "..");
const source = path.join(root, "src/assets/logo-evolua-mark.png");
const outDir = path.join(root, "resources");

const LIGHT_BG = "#F7F9F7"; // --background do tema claro
const DARK_BG = "#111B16"; // --background do tema escuro
const BRAND = "#2D6A4F"; // --primary-600, cor base da marca

async function buildSquare({ size, outFile, logoRatio, background }) {
  const logoWidth = Math.round(size * logoRatio);
  const logo = await sharp(source).resize({ width: logoWidth, fit: "inside" }).toBuffer();
  const logoMeta = await sharp(logo).metadata();

  await sharp({
    create: { width: size, height: size, channels: 4, background },
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

  console.log(`gerado: resources/${outFile}`);
}

// Ícone principal (usado como fallback e no iOS, que não aceita transparência)
await buildSquare({ size: 1024, outFile: "icon.png", logoRatio: 0.75, background: LIGHT_BG });

// Ícone adaptativo Android: camada de fundo (cor sólida) + camada de frente (logo,
// dentro da "safe zone" de ~66% que o Android usa para recortar em vários formatos)
await sharp({ create: { width: 1024, height: 1024, channels: 4, background: BRAND } })
  .png()
  .toFile(path.join(outDir, "icon-background.png"));
console.log("gerado: resources/icon-background.png");

await buildSquare({
  size: 1024,
  outFile: "icon-foreground.png",
  logoRatio: 0.5,
  background: { r: 0, g: 0, b: 0, alpha: 0 },
});

// Splash screens (tela de abertura nativa)
await buildSquare({ size: 2732, outFile: "splash.png", logoRatio: 0.32, background: LIGHT_BG });
await buildSquare({ size: 2732, outFile: "splash-dark.png", logoRatio: 0.32, background: DARK_BG });
