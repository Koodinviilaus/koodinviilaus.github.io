import { FontLoader, type Font } from "three/examples/jsm/loaders/FontLoader.js";

const FONT_URL = new URL("../../assets/fonts/helvetiker_regular.typeface.json", import.meta.url).href;

let cachedFont: Promise<Font> | null = null;

export function loadDefaultFont(): Promise<Font> {
  if (!cachedFont) {
    const loader = new FontLoader();
    cachedFont = loader.loadAsync(FONT_URL);
  }
  return cachedFont;
}

export function resetFontCache() {
  cachedFont = null;
}
