import React, { useRef, useState, useCallback, useEffect } from "react";
import { BoundingBox, DrawingMode } from "./types";
import { BBOX_COLORS, getLabelInfo, TAMIL_GROUPS } from "./tamilData";

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

interface DrawState {
  startX: number;
  startY: number;
  currentX: number;
  currentY: number;
  active: boolean;
}

interface ResizeState {
  active: boolean;
  bboxId: string | null;
  handle: 'nw' | 'ne' | 'sw' | 'se' | 'n' | 's' | 'e' | 'w' | null;
  startX: number;
  startY: number;
  originalBox: { x: number; y: number; w: number; h: number } | null;
}

interface Props {
  imageSrc: string | null;
  imageNaturalWidth: number;
  imageNaturalHeight: number;
  bboxes: BoundingBox[];
  selectedId: string | null;
  mode: DrawingMode;
  zoom: number;
  // the handler receives a bbox object *without* any metadata fields that are
  // initialized internally (labels, variant, joins, confidence, createdAt,
  // glyphId).  AnnotationWorkspace.handleAddBBox will fill those in itself.
  onAddBBox: (bbox: Omit<BoundingBox, "labels" | "variant" | "joins" | "confidence" | "createdAt" | "glyphId">) => void;
  onSelectBBox: (id: string | null) => void;
  onUpdateBBox: (id: string, updates: Partial<BoundingBox>) => void;
  onDragOver: (e: React.DragEvent) => void;
  onDrop: (e: React.DragEvent) => void;
  onEnterCanvas?: () => void; // called when cursor enters manuscript area
  // deltaY from wheel event; negative values imply scroll up (zoom in),
  // positive -> scroll down (zoom out).
  onZoomWheel?: (deltaY: number) => void;
}

export function ImageCanvas({
  imageSrc,
  imageNaturalWidth,
  imageNaturalHeight,
  bboxes,
  selectedId,
  mode,
  zoom,
  onAddBBox,
  onSelectBBox,
  onUpdateBBox,
  onDragOver,
  onDrop,
  onEnterCanvas,
}: Props) {
  const scrollRef = useRef<HTMLDivElement>(null);
  const containerRef = useRef<HTMLDivElement>(null);
  const [drawState, setDrawState] = useState<DrawState>({
    startX: 0,
    startY: 0,
    currentX: 0,
    currentY: 0,
    active: false,
  });
  const [resizeState, setResizeState] = useState<ResizeState>({
    active: false,
    bboxId: null,
    handle: null,
    startX: 0,
    startY: 0,
    originalBox: null,
  });
  const colorIndexRef = useRef(0);
  const [containerSize, setContainerSize] = useState({ w: 0, h: 0 });
  const [hoveredId, setHoveredId] = useState<string | null>(null);
  const [isPanning, setIsPanning] = useState(false);
  const panStateRef = useRef<{
    active: boolean;
    startX: number;
    startY: number;
    startScrollLeft: number;
    startScrollTop: number;
  }>({
    active: false,
    startX: 0,
    startY: 0,
    startScrollLeft: 0,
    startScrollTop: 0,
  });

  // Track container size for scale calculations
  useEffect(() => {
    if (!containerRef.current) return;
    const obs = new ResizeObserver((entries) => {
      const entry = entries[0];
      if (entry) {
        setContainerSize({ w: entry.contentRect.width, h: entry.contentRect.height });
      }
    });
    obs.observe(containerRef.current);
    return () => obs.disconnect();
  }, [imageSrc]);

  // Also set initial size after image loads
  const handleImageLoad = (e: React.SyntheticEvent<HTMLImageElement>) => {
    const img = e.currentTarget;
    setContainerSize({ w: img.offsetWidth, h: img.offsetHeight });
  };

  const getRelativePos = useCallback((e: React.MouseEvent) => {
    const container = containerRef.current;
    if (!container) return { x: 0, y: 0 };
    const rect = container.getBoundingClientRect();
    const x = (e.clientX - rect.left) / zoom;
    const y = (e.clientY - rect.top) / zoom;
    return { x, y };
  }, [zoom]);

  const handleMouseDown = useCallback(
    (e: React.MouseEvent) => {
      if (!imageSrc) return;
      if (mode === "pan") {
        const scroller = scrollRef.current;
        if (!scroller) return;
        e.preventDefault();
        panStateRef.current = {
          active: true,
          startX: e.clientX,
          startY: e.clientY,
          startScrollLeft: scroller.scrollLeft,
          startScrollTop: scroller.scrollTop,
        };
        setIsPanning(true);
        return;
      }
      if (mode !== "draw") return;
      e.preventDefault();
      const { x, y } = getRelativePos(e);
      setDrawState({ startX: x, startY: y, currentX: x, currentY: y, active: true });
      onSelectBBox(null);
    },
    [mode, imageSrc, getRelativePos, onSelectBBox]
  );

  const handleMouseMove = useCallback(
    (e: React.MouseEvent) => {
      if (panStateRef.current.active) {
        const scroller = scrollRef.current;
        if (scroller) {
          const dx = e.clientX - panStateRef.current.startX;
          const dy = e.clientY - panStateRef.current.startY;
          scroller.scrollLeft = panStateRef.current.startScrollLeft - dx;
          scroller.scrollTop = panStateRef.current.startScrollTop - dy;
        }
        return;
      }
      if (drawState.active) {
        const { x, y } = getRelativePos(e);
        setDrawState((prev) => ({ ...prev, currentX: x, currentY: y }));
      }
      
      if (resizeState.active && resizeState.bboxId && resizeState.originalBox) {
        const { x, y } = getRelativePos(e);
        const dx = x - resizeState.startX;
        const dy = y - resizeState.startY;

        const scaleX = imageNaturalWidth / (containerRef.current?.offsetWidth || 1);
        const scaleY = imageNaturalHeight / (containerRef.current?.offsetHeight || 1);

        const orig = resizeState.originalBox;
        let newX = orig.x;
        let newY = orig.y;
        let newW = orig.w;
        let newH = orig.h;

        switch (resizeState.handle) {
          case 'nw':
            newX = orig.x + Math.round(dx * scaleX);
            newY = orig.y + Math.round(dy * scaleY);
            newW = orig.w - Math.round(dx * scaleX);
            newH = orig.h - Math.round(dy * scaleY);
            break;
          case 'ne':
            newY = orig.y + Math.round(dy * scaleY);
            newW = orig.w + Math.round(dx * scaleX);
            newH = orig.h - Math.round(dy * scaleY);
            break;
          case 'sw':
            newX = orig.x + Math.round(dx * scaleX);
            newW = orig.w - Math.round(dx * scaleX);
            newH = orig.h + Math.round(dy * scaleY);
            break;
          case 'se':
            newW = orig.w + Math.round(dx * scaleX);
            newH = orig.h + Math.round(dy * scaleY);
            break;
        }

        // Update bbox with new dimensions
        onUpdateBBox(resizeState.bboxId, { x: newX, y: newY, w: newW, h: newH });
      }
    },
    [drawState.active, resizeState, getRelativePos, imageNaturalWidth, imageNaturalHeight, onUpdateBBox]
  );

  const handleMouseUp = useCallback(
    (e: React.MouseEvent) => {
      if (panStateRef.current.active) {
        panStateRef.current.active = false;
        setIsPanning(false);
        return;
      }
      if (drawState.active) {
        const { x, y } = getRelativePos(e);
        const rawX = Math.min(drawState.startX, x);
        const rawY = Math.min(drawState.startY, y);
        const rawW = Math.abs(x - drawState.startX);
        const rawH = Math.abs(y - drawState.startY);

        // Scale to image coordinates
        const scaleX = imageNaturalWidth / (containerRef.current?.offsetWidth || 1);
        const scaleY = imageNaturalHeight / (containerRef.current?.offsetHeight || 1);

        const imgX = Math.round(rawX * scaleX);
        const imgY = Math.round(rawY * scaleY);
        const imgW = Math.round(rawW * scaleX);
        const imgH = Math.round(rawH * scaleY);

        const colorIdx = colorIndexRef.current % BBOX_COLORS.length;
        const color = BBOX_COLORS[colorIdx];
        colorIndexRef.current += 1;

        const id = `g_${Date.now().toString(36)}_${String(bboxes.length).padStart(3, "0")}`;
        onAddBBox({ id, x: imgX, y: imgY, w: imgW, h: imgH, color });
        setDrawState((prev) => ({ ...prev, active: false }));
      }
      
      if (resizeState.active) {
        setResizeState({
          active: false,
          bboxId: null,
          handle: null,
          startX: 0,
          startY: 0,
          originalBox: null,
        });
      }
    },
    [drawState, resizeState, getRelativePos, imageNaturalWidth, imageNaturalHeight, bboxes.length, onAddBBox]
  );

  // Current drawing preview in display-space (in unscaled image-display space)
  const previewLeft = Math.min(drawState.startX, drawState.currentX);
  const previewTop = Math.min(drawState.startY, drawState.currentY);
  const previewW = Math.abs(drawState.currentX - drawState.startX);
  const previewH = Math.abs(drawState.currentY - drawState.startY);

  return (
    <div
      ref={scrollRef}
      className="relative overflow-auto w-full h-full bg-zinc-900 flex items-center justify-center"
      onDragOver={onDragOver}
      onDrop={onDrop}
      onMouseEnter={() => {
        if (onEnterCanvas) onEnterCanvas();
      }}
    >
      {!imageSrc ? (
        <div className="flex flex-col items-center justify-center gap-4 text-zinc-400 select-none pointer-events-none">
          <div className="w-24 h-24 rounded-full border-2 border-dashed border-zinc-600 flex items-center justify-center">
            <svg width="40" height="40" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5">
              <path d="M4 16l4-4 4 4M12 12l4-4 4 4M4 20h16" />
              <path d="M4 4h16v12H4z" strokeDasharray="4 2" />
            </svg>
          </div>
          <div className="text-center">
            <p className="text-lg" style={{ fontWeight: 500 }}>Drop manuscript image here</p>
            <p className="text-sm text-zinc-500 mt-1">Supports JPG, PNG, TIFF — Palm leaf scans</p>
          </div>
        </div>
      ) : (
        <div
          style={{ transform: `scale(${zoom})`, transformOrigin: "top left", position: "relative", display: "inline-block" }}
        >
          <div
            ref={containerRef}
            className="relative select-none"
            style={{
              cursor:
                mode === "draw"
                  ? "crosshair"
                  : mode === "select"
                    ? "pointer"
                    : isPanning
                      ? "grabbing"
                      : "grab",
            }}
            onMouseDown={handleMouseDown}
            onMouseMove={handleMouseMove}
            onMouseUp={handleMouseUp}
            onMouseLeave={() => {
              setDrawState((prev) => ({ ...prev, active: false }));
              if (panStateRef.current.active) {
                panStateRef.current.active = false;
                setIsPanning(false);
              }
            }}
          >
            <img
              src={imageSrc}
              alt="Manuscript"
              style={{ display: "block", maxWidth: "100%", userSelect: "none", pointerEvents: "none" }}
              draggable={false}
              onLoad={handleImageLoad}
            />

            {/* Rendered bboxes */}
            {bboxes.map((bbox) => {
              const cW = containerSize.w || containerRef.current?.offsetWidth || 1;
              const cH = containerSize.h || containerRef.current?.offsetHeight || 1;
              const displayX = (bbox.x / imageNaturalWidth) * cW;
              const displayY = (bbox.y / imageNaturalHeight) * cH;
              const displayW = (bbox.w / imageNaturalWidth) * cW;
              const displayH = (bbox.h / imageNaturalHeight) * cH;
              const isSelected = bbox.id === selectedId;
              const isHovered = bbox.id === hoveredId;

              // Build tooltip info for all assigned labels
              const labelInfos = bbox.labels
                .map((lbl) => getLabelInfo(lbl))
                .filter(Boolean);

              // Derive unique groups from labels
              const groups = Array.from(
                new Map(labelInfos.map((info) => [info!.group, info!])).values()
              );

              // Flip tooltip above or below based on vertical space
              const showBelow = displayY < 80;

              return (
                <div
                  key={bbox.id}
                  onClick={(e) => {
                    e.stopPropagation();
                    if (mode === "select" || mode === "draw") onSelectBBox(bbox.id);
                  }}
                  onMouseEnter={() => setHoveredId(bbox.id)}
                  onMouseLeave={() => setHoveredId(null)}
                  style={{
                    position: "absolute",
                    left: displayX,
                    top: displayY,
                    width: displayW,
                    height: displayH,
                    border: isSelected 
                      ? `1px dotted ${bbox.color}` 
                      : `1px solid ${bbox.color}`,
                    boxShadow: isSelected
                      ? `inset 0 0 0 1px ${bbox.color}`
                      : `inset 0 0 0 1px ${bbox.color}30`,
                    backgroundColor: isSelected ? `${bbox.color}20` : `${bbox.color}10`,
                    cursor: "pointer",
                    boxSizing: "border-box",
                    transition: "box-shadow 0.1s",
                  }}
                >
                  {/* Label badge (only visible on hover) */}
                  {isHovered && (() => {
                    // Get the first label's character info
                    const firstLabelInfo = bbox.labels.length > 0 ? getLabelInfo(bbox.labels[0]) : null;
                    
                    // For custom folders, show only the Tamil character
                    const isCustomFolder = bbox.labels[0]?.startsWith("FOLDER_");
                    const displayChar = firstLabelInfo?.char || "—";
                    const displayText = displayChar;
                    
                    return (
                      <div
                        style={{
                          position: "absolute",
                          top: -26,
                          left: -1,
                          backgroundColor: bbox.color,
                          color: "#fff",
                          padding: "2px 6px",
                          borderRadius: "4px 4px 4px 0",
                          fontSize: 16,
                          fontFamily: "'Noto Sans Tamil', serif",
                          whiteSpace: "nowrap",
                          fontWeight: 600,
                          lineHeight: "20px",
                          pointerEvents: "none",
                          display: "flex",
                          alignItems: "center",
                          gap: 3,
                        }}
                      >
                        {displayText}
                        {bbox.labels.length > 1 && (
                          <span style={{ opacity: 0.8, fontSize: 9, fontFamily: "sans-serif" }}>
                            +{bbox.labels.length - 1}
                          </span>
                        )}
                      </div>
                    );
                  })()}

                  {/* Glyph ID badge (only visible on hover) */}
                  {isHovered && (
                    <div
                      style={{
                        position: "absolute",
                        bottom: -22,
                        left: -1,
                        backgroundColor: "#0f172a",
                        color: "#94a3b8",
                        padding: "2px 6px",
                        borderRadius: "0 0 4px 4px",
                        fontSize: 9,
                        fontFamily: "monospace",
                        whiteSpace: "nowrap",
                        fontWeight: 600,
                          lineHeight: "16px",
                          pointerEvents: "none",
                          border: `1px solid ${bbox.color}`,
                          borderTop: "none",
                        }}
                      >
                        {bbox.glyphId}
                      </div>
                    )}


                  {/* Resize handles (only for selected bbox) */}
                  {isSelected && (
                    <>
                      {/* Corner handles */}
                      {[
                        { position: 'nw', top: -3, left: -3, cursor: 'nw-resize' },
                        { position: 'ne', top: -3, right: -3, cursor: 'ne-resize' },
                        { position: 'sw', bottom: -3, left: -3, cursor: 'sw-resize' },
                        { position: 'se', bottom: -3, right: -3, cursor: 'se-resize' },
                      ].map((handle) => (
                        <div
                          key={handle.position}
                          onMouseDown={(e) => {
                            e.stopPropagation();
                            const { x, y } = getRelativePos(e);
                            setResizeState({
                              active: true,
                              bboxId: bbox.id,
                              handle: handle.position as any,
                              startX: x,
                              startY: y,
                              originalBox: { x: bbox.x, y: bbox.y, w: bbox.w, h: bbox.h },
                            });
                          }}
                          style={{
                            position: "absolute",
                            width: 5,
                            height: 5,
                            backgroundColor: bbox.color,
                            border: `1px solid white`,
                            borderRadius: '50%',
                            cursor: handle.cursor,
                            ...{ 
                              top: handle.top, 
                              bottom: handle.bottom, 
                              left: handle.left, 
                              right: handle.right 
                            },
                          }}
                        />
                      ))}
                    </>
                  )}
                </div>
              );
            })}

            {/* Drawing preview */}
            {drawState.active && previewW > 2 && previewH > 2 && (
              <div
                style={{
                  position: "absolute",
                  left: previewLeft,
                  top: previewTop,
                  width: previewW,
                  height: previewH,
                  border: `1px dashed ${BBOX_COLORS[colorIndexRef.current % BBOX_COLORS.length]}`,
                  backgroundColor: `${BBOX_COLORS[colorIndexRef.current % BBOX_COLORS.length]}15`,
                  pointerEvents: "none",
                  boxSizing: "border-box",
                }}
              />
            )}
          </div>
        </div>
      )}
    </div>
  );
}
