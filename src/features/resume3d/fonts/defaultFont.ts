import {
  FontLoader,
  type Font,
} from "three/examples/jsm/loaders/FontLoader.js";
import fontUrl from "../../../assets/fonts/helvetiker_regular.typeface.json?url";

const FONT_URL = fontUrl;

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
