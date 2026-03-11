import React, { useState, useRef, useCallback, useEffect } from "react";
import JSZip from "jszip";
import { BoundingBox, DrawingMode, ExportData, GlyphAnnotation, ImageMeta, TamilChar } from "./types";
import { ImageCanvas } from "./ImageCanvas";
import { CharacterPanel } from "./CharacterPanel";
import { PropertiesPanel } from "./PropertiesPanel";
import { Toolbar } from "./Toolbar";
import { CharacterSearchModal } from "./CharacterSearchModal";
import { TAMIL_GROUPS, registerCustomChar, getCustomChar, clearCustomChars } from "./tamilData";

// Create a mapping from label to Tamil character
const LABEL_TO_TAMIL_MAP = new Map<string, string>();
TAMIL_GROUPS.forEach((group) => {
  group.chars.forEach((char) => {
    LABEL_TO_TAMIL_MAP.set(char.label, char.char);
    char.variants.forEach((variant) => {
      LABEL_TO_TAMIL_MAP.set(variant.label, char.char);
    });
  });
});

const DEFAULT_VARIANT = {
  elongated: false,
  broken: false,
  striked_out: "none" as const,
};

const DEFAULT_JOINS = {
  horizontal: false,
  vertical: false,
  touching_ids: [],
};

interface EncodedGlyph {
  key: string;
  bboxId: string;
  label: string;
  vector: number[];
}

const RECOMMENDATION_MEMORY_KEY = "annotation_recommendation_memory_v1";
const RECOMMENDATION_MEMORY_MAX = 4000;

function makeEncodedGlyphKey(label: string, vector: number[]): string {
  const fingerprint = vector
    .slice(0, 24)
    .map((v) => v.toFixed(3))
    .join(",");
  return `${label}|${fingerprint}`;
}

function generateImageId(fileName: string): string {
  const base = fileName.replace(/\.[^.]+$/, "").replace(/[^a-zA-Z0-9]/g, "_");
  return base.toLowerCase().replace(/__+/g, "_").substring(0, 30);
}

function estimateDPI(width: number, height: number): number {
  // Estimate DPI from resolution (common palm-leaf scan sizes)
  if (width >= 4960 || height >= 7016) return 600;
  if (width >= 2480 || height >= 3508) return 300;
  if (width >= 1240 || height >= 1754) return 150;
  return 72;
}

function toYAML(value: unknown, indent = 0): string {
  const pad = "  ".repeat(indent);

  if (value === null) return "null";
  if (typeof value === "number" || typeof value === "boolean") return String(value);
  if (typeof value === "string") {
    return JSON.stringify(value);
  }

  if (Array.isArray(value)) {
    if (value.length === 0) return "[]";
    return value
      .map((item) => {
        if (
          item === null ||
          typeof item === "number" ||
          typeof item === "boolean" ||
          typeof item === "string"
        ) {
          return `${pad}- ${toYAML(item, indent + 1)}`;
        }
        return `${pad}-\n${toYAML(item, indent + 1)}`;
      })
      .join("\n");
  }

  const obj = value as Record<string, unknown>;
  const entries = Object.entries(obj);
  if (entries.length === 0) return "{}";

  return entries
    .map(([key, val]) => {
      if (val === undefined) return null;
      if (
        val === null ||
        typeof val === "number" ||
        typeof val === "boolean" ||
        typeof val === "string"
      ) {
        return `${pad}${key}: ${toYAML(val, indent + 1)}`;
      }
      return `${pad}${key}:\n${toYAML(val, indent + 1)}`;
    })
    .filter((line): line is string => line !== null)
    .join("\n");
}

function cosineSimilarity(a: number[], b: number[]): number {
  let dot = 0;
  let normA = 0;
  let normB = 0;
  const len = Math.min(a.length, b.length);
  for (let i = 0; i < len; i += 1) {
    dot += a[i] * b[i];
    normA += a[i] * a[i];
    normB += b[i] * b[i];
  }
  if (normA === 0 || normB === 0) return 0;
  return dot / (Math.sqrt(normA) * Math.sqrt(normB));
}

function cosineSimilarity01(a: number[], b: number[]): number {
  const cos = cosineSimilarity(a, b);
  return (cos + 1) / 2; // [-1,1] -> [0,1] for UI-friendly percent score
}

async function loadImage(src: string): Promise<HTMLImageElement> {
  return new Promise((resolve, reject) => {
    const img = new window.Image();
    img.crossOrigin = "anonymous";
    img.onload = () => resolve(img);
    img.onerror = reject;
    img.src = src;
  });
}

function encodeBBox(image: HTMLImageElement, bbox: BoundingBox, size = 16): number[] | null {
  if (bbox.w <= 1 || bbox.h <= 1) return null;
  const canvas = document.createElement("canvas");
  canvas.width = size;
  canvas.height = size;
  const ctx = canvas.getContext("2d", { willReadFrequently: true });
  if (!ctx) return null;

  ctx.drawImage(
    image,
    bbox.x, bbox.y, bbox.w, bbox.h,
    0, 0, size, size
  );

  const data = ctx.getImageData(0, 0, size, size).data;
  const vector: number[] = [];
  for (let i = 0; i < data.length; i += 4) {
    const r = data[i];
    const g = data[i + 1];
    const b = data[i + 2];
    const gray = (0.299 * r + 0.587 * g + 0.114 * b) / 255;
    vector.push(gray);
  }

  const mean = vector.reduce((sum, v) => sum + v, 0) / vector.length;
  const centered = vector.map((v) => v - mean);
  return centered;
}

export function AnnotationWorkspace() {
  const [imageMeta, setImageMeta] = useState<ImageMeta | null>(null);
  const [bboxes, setBboxes] = useState<BoundingBox[]>([]);
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [mode, setMode] = useState<DrawingMode>("draw");
  const [zoom, setZoom] = useState(1);
  const [showSearchModal, setShowSearchModal] = useState(false);
  const [newBoxId, setNewBoxId] = useState<string | null>(null);
  const [recommendationEnabled, setRecommendationEnabled] = useState<boolean>(() => {
    try {
      const stored = localStorage.getItem("annotation_recommendations_enabled");
      return stored == null ? true : stored === "true";
    } catch {
      return true;
    }
  });
  const [recommendedLabel, setRecommendedLabel] = useState<string | null>(null);
  const [recommendedScore, setRecommendedScore] = useState<number | null>(null);
  const [imageReadySrc, setImageReadySrc] = useState<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const undoStackRef = useRef<BoundingBox[][]>([]);
  const redoStackRef = useRef<BoundingBox[][]>([]);
  const imageRef = useRef<HTMLImageElement | null>(null);
  const [encodedGlyphs, setEncodedGlyphs] = useState<EncodedGlyph[]>([]);
  const [recommendationMemory, setRecommendationMemory] = useState<EncodedGlyph[]>(() => {
    try {
      const raw = localStorage.getItem(RECOMMENDATION_MEMORY_KEY);
      if (!raw) return [];
      const parsed = JSON.parse(raw) as EncodedGlyph[];
      if (!Array.isArray(parsed)) return [];
      return parsed.filter(
        (item) =>
          item &&
          typeof item.label === "string" &&
          Array.isArray(item.vector) &&
          item.vector.every((v) => typeof v === "number")
      );
    } catch {
      return [];
    }
  });

  // user-defined characters/folders that should persist across sessions
  const [customChars, setCustomChars] = useState<TamilChar[]>(() => {
    try {
      const stored = localStorage.getItem("user_custom_chars");
      if (stored) return JSON.parse(stored) as TamilChar[];
    } catch { }
    return [];
  });

  const selectedBbox = bboxes.find((b) => b.id === selectedId) ?? null;

  const cloneBBoxes = useCallback((boxes: BoundingBox[]): BoundingBox[] => {
    return boxes.map((b) => ({
      ...b,
      labels: [...b.labels],
      variant: { ...b.variant },
      joins: { ...b.joins, touching_ids: [...b.joins.touching_ids] },
      createdAt: new Date(b.createdAt),
    }));
  }, []);

  const pushUndoSnapshot = useCallback(
    (snapshot: BoundingBox[]) => {
      undoStackRef.current.push(cloneBBoxes(snapshot));
      if (undoStackRef.current.length > 100) {
        undoStackRef.current.shift();
      }
      redoStackRef.current = [];
    },
    [cloneBBoxes]
  );

  const updateBBoxesWithHistory = useCallback(
    (updater: (prev: BoundingBox[]) => BoundingBox[]) => {
      setBboxes((prev) => {
        const next = updater(prev);
        if (next === prev) return prev;
        pushUndoSnapshot(prev);
        return next;
      });
    },
    [pushUndoSnapshot]
  );

  // Handle image load
  const loadImageFile = useCallback((file: File) => {
    const url = URL.createObjectURL(file);
    const img = new window.Image();
    img.onload = () => {
      const dpi = estimateDPI(img.naturalWidth, img.naturalHeight);
      const meta: ImageMeta = {
        image_id: generateImageId(file.name),
        src: url,
        naturalWidth: img.naturalWidth,
        naturalHeight: img.naturalHeight,
        dpi,
        fileName: file.name,
      };
      setImageMeta(meta);
      setBboxes([]);
      imageRef.current = null;
      setImageReadySrc(null);
      setEncodedGlyphs([]);
      setRecommendedLabel(null);
      setRecommendedScore(null);
      undoStackRef.current = [];
      redoStackRef.current = [];
      setSelectedId(null);
      setZoom(1);
    };
    img.src = url;
  }, []);

  const handleFileDrop = useCallback(
    (e: React.DragEvent) => {
      e.preventDefault();
      const file = e.dataTransfer.files[0];
      if (file && file.type.startsWith("image/")) {
        loadImageFile(file);
      }
    },
    [loadImageFile]
  );

  const handleFileInput = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) loadImageFile(file);
  };

  // BBox management
  const handleAddBBox = useCallback(
    (bbox: Omit<BoundingBox, "labels" | "variant" | "joins" | "confidence" | "createdAt" | "glyphId">) => {
      const created = new Date();
      const pad = (n: number) => String(n).padStart(2, "0");
      const tstr = `${pad(created.getHours())}_${pad(created.getMinutes())}_${pad(created.getSeconds())}`;
      const newBBox: BoundingBox = {
        ...bbox,
        labels: [],
        variant: { ...DEFAULT_VARIANT },
        joins: { ...DEFAULT_JOINS, touching_ids: [] },
        confidence: 1.0,
        createdAt: created,
        glyphId: `g_unlabeled_${tstr}`,
      };
      updateBBoxesWithHistory((prev) => [...prev, newBBox]);
      setSelectedId(newBBox.id);
      setNewBoxId(newBBox.id);
      setShowSearchModal(true);
    },
    [updateBBoxesWithHistory]
  );

  const handleUpdateBBox = useCallback((id: string, updates: Partial<BoundingBox>) => {
    updateBBoxesWithHistory((prev) =>
      prev.map((b) => (b.id === id ? { ...b, ...updates } : b))
    );
  }, [updateBBoxesWithHistory]);

  const handleDeleteBBox = useCallback((id: string) => {
    updateBBoxesWithHistory((prev) => {
      const remaining = prev.filter((b) => b.id !== id);
      // Clean up touching_ids references
      return remaining.map((b) => ({
        ...b,
        joins: {
          ...b.joins,
          touching_ids: b.joins.touching_ids.filter((tid) => tid !== id),
        },
      }));
    });
    setSelectedId(null);
  }, [updateBBoxesWithHistory]);

  // Labels
  // helper to build glyph id from a label and creation time
  const buildGlyphId = (label: string | null, createdAt: Date) => {
    const pad = (n: number) => String(n).padStart(2, "0");
    const hours = pad(createdAt.getHours());
    const minutes = pad(createdAt.getMinutes());
    const seconds = pad(createdAt.getSeconds());
    let charName: string;
    if (!label) {
      charName = "unlabeled";
    } else if (label.startsWith("FOLDER_")) {
      // custom folder: use the Tamil character from the registry
      const customChar = getCustomChar(label);
      charName = customChar ? customChar.char : label.replace("FOLDER_", "");
    } else {
      charName = LABEL_TO_TAMIL_MAP.get(label) || label;
    }
    return `g_${charName}_${hours}_${minutes}_${seconds}`;
  };

  const handleAddLabel = useCallback(
    (label: string) => {
      if (!selectedId) return;
      updateBBoxesWithHistory((prev) =>
        prev.map((b) => {
          if (b.id === selectedId && !b.labels.includes(label)) {
            const newLabels = [...b.labels, label];
            const newGlyph = buildGlyphId(newLabels[0] || null, b.createdAt);
            return { ...b, labels: newLabels, glyphId: newGlyph };
          }
          return b;
        })
      );
    },
    [selectedId, updateBBoxesWithHistory]
  );

  const handleRemoveLabel = useCallback(
    (label: string) => {
      if (!selectedId) return;
      updateBBoxesWithHistory((prev) =>
        prev.map((b) => {
          if (b.id === selectedId) {
            const newLabels = b.labels.filter((l) => l !== label);
            const newGlyph = buildGlyphId(newLabels[0] || null, b.createdAt);
            return { ...b, labels: newLabels, glyphId: newGlyph };
          }
          return b;
        })
      );
    },
    [selectedId, updateBBoxesWithHistory]
  );

  const handleDeleteCustomChar = (label: string) => {
    setCustomChars((prev) => prev.filter((c) => c.label !== label));
    updateBBoxesWithHistory((prev) =>
      prev.map((b) => {
        if (!b.labels.includes(label)) return b;
        const nextLabels = b.labels.filter((l) => l !== label);
        const nextGlyphId = buildGlyphId(nextLabels[0] || null, b.createdAt);
        return { ...b, labels: nextLabels, glyphId: nextGlyphId };
      })
    );
  };

  const handleSelectCharacterFromSearch = useCallback(
    (label: string) => {
      if (!newBoxId) return;
      updateBBoxesWithHistory((prev) =>
        prev.map((b) => {
          if (b.id === newBoxId && !b.labels.includes(label)) {
            const newLabels = [...b.labels, label];
            const newGlyph = buildGlyphId(newLabels[0] || null, b.createdAt);
            return { ...b, labels: newLabels, glyphId: newGlyph };
          }
          return b;
        })
      );
      setShowSearchModal(false);
      setNewBoxId(null);
    },
    [newBoxId, updateBBoxesWithHistory]
  );

  const handleUndo = useCallback(() => {
    const snapshot = undoStackRef.current.pop();
    if (!snapshot) return;
    setBboxes((prev) => {
      redoStackRef.current.push(cloneBBoxes(prev));
      return cloneBBoxes(snapshot);
    });
    setShowSearchModal(false);
    setNewBoxId(null);
  }, [cloneBBoxes]);

  const handleRedo = useCallback(() => {
    const snapshot = redoStackRef.current.pop();
    if (!snapshot) return;
    setBboxes((prev) => {
      undoStackRef.current.push(cloneBBoxes(prev));
      return cloneBBoxes(snapshot);
    });
    setShowSearchModal(false);
    setNewBoxId(null);
  }, [cloneBBoxes]);

  useEffect(() => {
    if (selectedId && !bboxes.some((b) => b.id === selectedId)) {
      setSelectedId(null);
    }
  }, [bboxes, selectedId]);

  // Zoom
  const handleZoomIn = () => setZoom((z) => Math.min(z + 0.25, 4));
  const handleZoomOut = () => setZoom((z) => Math.max(z - 0.25, 0.25));
  const handleZoomReset = () => setZoom(1);

  // Keyboard shortcuts
  useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      if (e.target instanceof HTMLInputElement || e.target instanceof HTMLSelectElement || e.target instanceof HTMLTextAreaElement) return;
      if (e.key === "d" || e.key === "D") setMode("draw");
      if (e.key === "s" || e.key === "S") setMode("select");
      if (e.key === "p" || e.key === "P") setMode("pan");
      if ((e.ctrlKey || e.metaKey) && !e.shiftKey && (e.key === "z" || e.key === "Z")) {
        e.preventDefault();
        handleUndo();
        return;
      }
      if (
        (e.ctrlKey || e.metaKey) &&
        (e.key === "y" || e.key === "Y" || ((e.key === "z" || e.key === "Z") && e.shiftKey))
      ) {
        e.preventDefault();
        handleRedo();
        return;
      }
      if (e.key === "Delete" || e.key === "Backspace") {
        if (selectedId) handleDeleteBBox(selectedId);
      }
      if (e.key === "=" || e.key === "+") handleZoomIn();
      if (e.key === "-" || e.key === "_") handleZoomOut();
      if (e.key === "0") handleZoomReset();
      if (e.key === "Escape") setSelectedId(null);
    };
    window.addEventListener("keydown", handler);
    return () => window.removeEventListener("keydown", handler);
  }, [selectedId, handleDeleteBBox, handleUndo, handleRedo]);

  // Export YAML
  const handleExportYAML = () => {
    if (!imageMeta) return;

    const imageLabel = {
      image_id: imageMeta.image_id,
      width: imageMeta.naturalWidth,
      height: imageMeta.naturalHeight,
      dpi: imageMeta.dpi,
    };

    // Get current time in HH_MM_SS format
    const now = new Date();
    const hours = String(now.getHours()).padStart(2, "0");
    const minutes = String(now.getMinutes()).padStart(2, "0");
    const seconds = String(now.getSeconds()).padStart(2, "0");
    const timeString = `${hours}_${minutes}_${seconds}`;

    const annotations: GlyphAnnotation[] = bboxes.map((b) => ({
      glyph_id: b.glyphId,
      image_id: imageMeta.image_id,
      bbox: [b.x, b.y, b.w, b.h],
      mask: null,
      // convert labels to tamil characters where possible
      labels: b.labels.map((l) => {
        // Standard Tamil character label
        if (LABEL_TO_TAMIL_MAP.has(l)) return LABEL_TO_TAMIL_MAP.get(l)!;
        // Custom folder â€” use the Tamil character entered by the user
        if (l.startsWith("FOLDER_")) {
          const customChar = getCustomChar(l);
          if (customChar) return customChar.char;
        }
        return l;
      }),
      variant: b.variant,
      // joins removed intentionally
      confidence: b.confidence,
    }));

    const exportData: ExportData = {
      image_label: imageLabel,
      annotations,
      ...(customChars.length > 0 ? { custom_chars: customChars } : {}),
    };

    const yaml = toYAML(exportData);
    const blob = new Blob([yaml], { type: "text/yaml" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `${imageMeta.image_id}_annotations.yaml`;
    a.click();
    URL.revokeObjectURL(url);
  };

  // Export cropped images as ZIP
  const handleExportImages = async () => {
    if (!imageMeta || bboxes.length === 0) return;

    // Load the original image
    const img = new window.Image();
    img.crossOrigin = "anonymous";

    await new Promise<void>((resolve, reject) => {
      img.onload = () => resolve();
      img.onerror = reject;
      img.src = imageMeta.src;
    });

    // Create canvas for cropping
    const canvas = document.createElement("canvas");
    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    const zip = new JSZip();

    // Process each bounding box
    for (let idx = 0; idx < bboxes.length; idx++) {
      const bbox = bboxes[idx];

      // Set canvas size to bbox size
      canvas.width = bbox.w;
      canvas.height = bbox.h;

      // Draw the cropped region
      ctx.drawImage(
        img,
        bbox.x, bbox.y, bbox.w, bbox.h,  // source rectangle
        0, 0, bbox.w, bbox.h              // destination rectangle
      );

      // Convert to blob
      const blob = await new Promise<Blob | null>((resolve) => {
        canvas.toBlob(resolve, "image/png");
      });

      if (blob) {
        const filename = `${bbox.id}.png`;

        // If bbox has labels, save in each label folder
        if (bbox.labels.length > 0) {
          for (const label of bbox.labels) {
            // Map label to Tamil character or use label as-is for custom folders
            let folderName = label;

            // If it's a standard Tamil character label, convert to Tamil character
            if (LABEL_TO_TAMIL_MAP.has(label)) {
              folderName = LABEL_TO_TAMIL_MAP.get(label)!;
            } else if (label.startsWith("FOLDER_")) {
              // For custom folders, use the Tamil character entered by the user
              const customChar = getCustomChar(label);
              folderName = customChar ? customChar.char : label.replace("FOLDER_", "").replace(/_/g, " ");
            }

            const folderPath = `${folderName}/${filename}`;
            zip.file(folderPath, blob);
          }
        } else {
          // If no labels, save in "unlabeled" folder
          zip.file(`unlabeled/${filename}`, blob);
        }
      }
    }

    // Generate and download the ZIP file
    const zipBlob = await zip.generateAsync({ type: "blob" });
    const url = URL.createObjectURL(zipBlob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `${imageMeta.image_id}_glyphs.zip`;
    a.click();
    URL.revokeObjectURL(url);
  };

  // persist custom chars whenever they change
  useEffect(() => {
    try {
      localStorage.setItem("user_custom_chars", JSON.stringify(customChars));
    } catch { }

    // keep registry aligned with current custom folder state
    clearCustomChars();
    customChars.forEach((c) => registerCustomChar(c));
  }, [customChars]);

  useEffect(() => {
    try {
      localStorage.setItem("annotation_recommendations_enabled", String(recommendationEnabled));
    } catch { }
  }, [recommendationEnabled]);

  // Load current manuscript image for descriptor extraction.
  useEffect(() => {
    let cancelled = false;
    const run = async () => {
      if (!imageMeta?.src) {
        imageRef.current = null;
        return;
      }
      try {
        const img = await loadImage(imageMeta.src);
        if (!cancelled) {
          imageRef.current = img;
          setImageReadySrc(imageMeta.src);
        }
      } catch {
        if (!cancelled) {
          imageRef.current = null;
          setImageReadySrc(null);
        }
      }
    };
    run();
    return () => {
      cancelled = true;
    };
  }, [imageMeta?.src]);

  // Background encoding index from already-labeled bboxes in current image.
  useEffect(() => {
    let cancelled = false;
    const run = async () => {
      if (!imageRef.current || !imageReadySrc || bboxes.length === 0) {
        setEncodedGlyphs([]);
        return;
      }

      const encoded: EncodedGlyph[] = [];
      for (const bbox of bboxes) {
        if (bbox.labels.length === 0) continue;
        const vector = encodeBBox(imageRef.current, bbox);
        if (!vector) continue;
        for (const label of bbox.labels) {
          encoded.push({
            key: makeEncodedGlyphKey(label, vector),
            bboxId: bbox.id,
            label,
            vector,
          });
        }
      }
      if (!cancelled) setEncodedGlyphs(encoded);
    };
    run();
    return () => {
      cancelled = true;
    };
  }, [bboxes, imageMeta?.src, imageReadySrc]);

  // Persist recommendation memory from all previously labeled characters.
  useEffect(() => {
    if (encodedGlyphs.length === 0) return;
    setRecommendationMemory((prev) => {
      const index = new Map<string, EncodedGlyph>();
      for (const item of prev) {
        index.set(item.key || makeEncodedGlyphKey(item.label, item.vector), item);
      }
      for (const item of encodedGlyphs) {
        index.set(item.key, item);
      }
      const next = Array.from(index.values());
      if (next.length > RECOMMENDATION_MEMORY_MAX) {
        return next.slice(next.length - RECOMMENDATION_MEMORY_MAX);
      }
      return next;
    });
  }, [encodedGlyphs]);

  useEffect(() => {
    try {
      localStorage.setItem(RECOMMENDATION_MEMORY_KEY, JSON.stringify(recommendationMemory));
    } catch { }
  }, [recommendationMemory]);

  // Find recommendation for the currently created bbox.
  useEffect(() => {
    const run = async () => {
      if (!showSearchModal || !newBoxId || !recommendationEnabled || !imageRef.current || !imageReadySrc) {
        setRecommendedLabel(null);
        setRecommendedScore(null);
        return;
      }

      const current = bboxes.find((b) => b.id === newBoxId);
      if (!current) {
        setRecommendedLabel(null);
        setRecommendedScore(null);
        return;
      }

      const targetVec = encodeBBox(imageRef.current, current);
      if (!targetVec) {
        setRecommendedLabel(null);
        setRecommendedScore(null);
        return;
      }

      const candidates = [...encodedGlyphs, ...recommendationMemory];
      let best: { label: string; score: number } | null = null;
      for (const item of candidates) {
        if (item.bboxId === newBoxId) continue;
        const score = cosineSimilarity01(targetVec, item.vector);
        if (!best || score > best.score) best = { label: item.label, score };
      }

      if (best) {
        // Always surface the highest-cosine label from existing annotations.
        setRecommendedLabel(best.label);
        setRecommendedScore(best.score);
      } else {
        setRecommendedLabel(null);
        setRecommendedScore(null);
      }
    };
    run();
  }, [showSearchModal, newBoxId, recommendationEnabled, bboxes, encodedGlyphs, recommendationMemory, imageReadySrc]);

  // Warn user before refresh/close when work exists.
  useEffect(() => {
    const hasWork = !!imageMeta || bboxes.length > 0;
    if (!hasWork) return;

    const handleBeforeUnload = (e: BeforeUnloadEvent) => {
      e.preventDefault();
      e.returnValue = "";
    };

    window.addEventListener("beforeunload", handleBeforeUnload);
    return () => window.removeEventListener("beforeunload", handleBeforeUnload);
  }, [imageMeta, bboxes.length]);

  return (
    <div
      className="flex flex-col h-screen w-full overflow-hidden"
      style={{ background: "#030b17", color: "#e2e8f0" }}
    >
      {/* Top Toolbar */}
      <Toolbar
        mode={mode}
        zoom={zoom}
        bboxCount={bboxes.filter(b => b.labels.length > 0).length}
        selectedId={selectedId}
        hasImage={!!imageMeta}
        imageName={imageMeta?.fileName ?? ""}
        onModeChange={setMode}
        onZoomIn={handleZoomIn}
        onZoomOut={handleZoomOut}
        onZoomReset={handleZoomReset}
        onExportYAML={handleExportYAML}
        onExportImages={handleExportImages}
        recommendationEnabled={recommendationEnabled}
        onToggleRecommendation={() => setRecommendationEnabled((prev) => !prev)}
        onClearAll={() => {
          updateBBoxesWithHistory(() => []);
          setSelectedId(null);
        }}
        onDeleteSelected={() => selectedId && handleDeleteBBox(selectedId)}
        onUploadClick={() => fileInputRef.current?.click()}
      />

      {/* Main layout */}
      <div className="flex flex-1 overflow-hidden">
        {/* Left: Character panel */}
        <div className="w-64 flex-shrink-0 overflow-hidden flex flex-col">
          <CharacterPanel
            selectedBBoxId={selectedId}
            selectedLabels={selectedBbox?.labels ?? []}
            allBBoxes={bboxes}
            onAddLabel={handleAddLabel}
            onRemoveLabel={handleRemoveLabel}
            customChars={customChars}
            onCreateCustomChar={(c) => setCustomChars((prev) => [...prev, c])}
            onDeleteCustomChar={handleDeleteCustomChar}
          />
        </div>

        {/* Center: Canvas */}
        <div className="flex-1 overflow-hidden">
          <ImageCanvas
            imageSrc={imageMeta?.src ?? null}
            imageNaturalWidth={imageMeta?.naturalWidth ?? 0}
            imageNaturalHeight={imageMeta?.naturalHeight ?? 0}
            bboxes={bboxes}
            selectedId={selectedId}
            mode={mode}
            zoom={zoom}
            onAddBBox={handleAddBBox}
            onSelectBBox={setSelectedId}
            onUpdateBBox={handleUpdateBBox}
            onDragOver={(e) => e.preventDefault()}
            onDrop={handleFileDrop}
            onZoomWheel={(deltaY) => {
              // deltaY is positive for scroll-down; zoom out.
              if (deltaY < 0) handleZoomIn();
              else if (deltaY > 0) handleZoomOut();
            }}
          />
        </div>

        {/* Right: Properties panel */}
        <div className="w-64 flex-shrink-0 overflow-hidden flex flex-col">
          <PropertiesPanel
            bbox={selectedBbox}
            allBBoxes={bboxes}
            imageMeta={imageMeta}
            onUpdate={handleUpdateBBox}
            onDelete={handleDeleteBBox}
            customChars={customChars}
          />
        </div>
      </div>

      {/* Keyboard shortcuts hint */}
      <div
        className="px-3 py-1 flex items-center gap-4 text-xs text-slate-600 flex-shrink-0"
        style={{ borderTop: "1px solid #1e293b", background: "#060f1e" }}
      >
        <span><kbd className="px-1 py-0.5 rounded text-xs" style={{ background: "#1e293b", color: "#94a3b8" }}>D</kbd> Draw</span>
        <span><kbd className="px-1 py-0.5 rounded text-xs" style={{ background: "#1e293b", color: "#94a3b8" }}>S</kbd> Select</span>
        <span><kbd className="px-1 py-0.5 rounded text-xs" style={{ background: "#1e293b", color: "#94a3b8" }}>P</kbd> Pan</span>
        <span><kbd className="px-1 py-0.5 rounded text-xs" style={{ background: "#1e293b", color: "#94a3b8" }}>Del</kbd> Delete</span>
        <span><kbd className="px-1 py-0.5 rounded text-xs" style={{ background: "#1e293b", color: "#94a3b8" }}>Ctrl+Z</kbd> Undo</span>
        <span><kbd className="px-1 py-0.5 rounded text-xs" style={{ background: "#1e293b", color: "#94a3b8" }}>Ctrl+Y</kbd> Redo</span>
        <span><kbd className="px-1 py-0.5 rounded text-xs" style={{ background: "#1e293b", color: "#94a3b8" }}>+/-</kbd> Zoom</span>
        <span><kbd className="px-1 py-0.5 rounded text-xs" style={{ background: "#1e293b", color: "#94a3b8" }}>0</kbd> Fit</span>
        <span><kbd className="px-1 py-0.5 rounded text-xs" style={{ background: "#1e293b", color: "#94a3b8" }}>Esc</kbd> Deselect</span>
        <div className="flex-1" />
        <span className="text-slate-700">Olaisuvadi Palm Leaf Annotation Tool • v1.0</span>
      </div>

      {/* Hidden file input */}
      <input
        ref={fileInputRef}
        type="file"
        accept="image/*,.tiff,.tif"
        className="hidden"
        onChange={handleFileInput}
      />

      {/* Character search modal */}
      <CharacterSearchModal
        isOpen={showSearchModal}
        onSelectCharacter={handleSelectCharacterFromSearch}
        recommendationEnabled={recommendationEnabled}
        recommendedLabel={recommendedLabel}
        recommendedScore={recommendedScore}
        onAcceptRecommendation={() => {
          if (!recommendedLabel) return;
          handleSelectCharacterFromSearch(recommendedLabel);
        }}
        onClose={() => {
          setShowSearchModal(false);
          setNewBoxId(null);
          setRecommendedLabel(null);
          setRecommendedScore(null);
        }}
        extraChars={customChars}
      />
    </div>
  );
}


