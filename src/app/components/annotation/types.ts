export type StrikedOut = "none" | "above line" | "below line" | "after" | "before";

export interface BBoxVariant {
  elongated: boolean;
  broken: boolean;
  striked_out: StrikedOut;
}

export interface BBoxJoins {
  horizontal: boolean;
  vertical: boolean;
  touching_ids: string[];
}

export interface BoundingBox {
  id: string;
  x: number;
  y: number;
  w: number;
  h: number;
  color: string;
  labels: string[];
  variant: BBoxVariant;
  joins: BBoxJoins;
  confidence: number;
  createdAt: Date;
  glyphId: string;
}

export interface ImageMeta {
  image_id: string;
  src: string;
  naturalWidth: number;
  naturalHeight: number;
  dpi: number;
  fileName: string;
}

export interface GlyphAnnotation {
  glyph_id: string;
  image_id: string;
  bbox: [number, number, number, number];
  mask: null;
  labels: string[];
  variant: {
    elongated: boolean;
    broken: boolean;
    striked_out: StrikedOut;
  };
  joins: {
    horizontal: boolean;
    vertical: boolean;
    touching_ids: string[];
  };
  confidence: number;
}

export interface ImageLabel {
  image_id: string;
  width: number;
  height: number;
  dpi: number;
}

export interface ExportData {
  image_label: ImageLabel;
  annotations: GlyphAnnotation[];
  custom_chars?: TamilChar[];
}

export interface TamilCharVariant {
  label: string;
  description: string;
  period?: string;
}

export interface TamilChar {
  char: string;
  label: string;
  name: string;
  variants: TamilCharVariant[];
}

export interface TamilGroup {
  group: string;
  icon: string;
  chars: TamilChar[];
}

export type DrawingMode = "draw" | "select" | "pan";
