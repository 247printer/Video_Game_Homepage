export type GraphicsQuality = "low" | "medium" | "high";

export const graphicsPresets = {
  low: { label: "Niedrig", pixelRatio: 1, resolution: .85, maxPixels: 1280*720, shadows: 0, shadowInterval: 0, anisotropy: 1, bloom: false, ao: false, particles: 160, weather: 40, detail: 0 },
  medium: { label: "Mittel", pixelRatio: 1.25, resolution: 1, maxPixels: 1920*1080, shadows: 1024, shadowInterval: .25, anisotropy: 4, bloom: true, ao: false, particles: 420, weather: 150, detail: 1 },
  high: { label: "Hoch", pixelRatio: 1.5, resolution: 1, maxPixels: 2560*1440, shadows: 2048, shadowInterval: .08, anisotropy: 8, bloom: true, ao: true, particles: 800, weather: 360, detail: 2 },
} as const;

export function isGraphicsQuality(value: unknown): value is GraphicsQuality {
  return value === "low" || value === "medium" || value === "high";
}

export function effectiveQuality(requested: GraphicsQuality, reduced: boolean): GraphicsQuality {
  return reduced ? "low" : requested;
}

export function graphicsPixelRatio(quality: GraphicsQuality, deviceRatio: number, width = 1, height = 1) {
  const preset = graphicsPresets[quality];
  return Math.min(Math.min(Math.max(deviceRatio || 1, 1), preset.pixelRatio) * preset.resolution, Math.sqrt(preset.maxPixels / Math.max(1,width*height)));
}
