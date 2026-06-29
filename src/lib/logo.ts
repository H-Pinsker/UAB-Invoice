import logoUrl from '../assets/logo.svg';

export { logoUrl };

/** Native aspect ratio of the logo (viewBox 0 0 192 70). */
export const LOGO_RATIO = 192 / 70;

/**
 * Rasterise the SVG logo to a PNG data URL using an offscreen canvas.
 * Used for the PDF export, since @react-pdf/renderer cannot embed an
 * external SVG file directly. Rendered at high scale for crisp print output.
 */
export async function logoToPngDataUrl(scale = 4): Promise<string | undefined> {
  try {
    const res = await fetch(logoUrl);
    const svgText = await res.text();
    const blob = new Blob([svgText], { type: 'image/svg+xml;charset=utf-8' });
    const blobUrl = URL.createObjectURL(blob);

    const img = new Image();
    img.crossOrigin = 'anonymous';
    await new Promise<void>((resolve, reject) => {
      img.onload = () => resolve();
      img.onerror = () => reject(new Error('logo load failed'));
      img.src = blobUrl;
    });

    const baseW = img.naturalWidth || 192;
    const baseH = img.naturalHeight || 70;
    const canvas = document.createElement('canvas');
    canvas.width = Math.round(baseW * scale);
    canvas.height = Math.round(baseH * scale);
    const ctx = canvas.getContext('2d');
    if (!ctx) return undefined;
    ctx.drawImage(img, 0, 0, canvas.width, canvas.height);
    URL.revokeObjectURL(blobUrl);
    return canvas.toDataURL('image/png');
  } catch {
    return undefined;
  }
}
