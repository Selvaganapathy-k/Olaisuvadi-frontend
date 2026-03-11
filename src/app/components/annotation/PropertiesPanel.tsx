import React, { useState } from "react";
import { BoundingBox, StrikedOut, TamilChar } from "./types";
import { Trash2, ChevronDown, Info, Tag, AlertTriangle, Folder } from "lucide-react";
import { getLabelInfo } from "./tamilData";

interface Props {
  bbox: BoundingBox | null;
  allBBoxes: BoundingBox[];
  imageMeta: { image_id: string; naturalWidth: number; naturalHeight: number; dpi: number } | null;
  onUpdate: (id: string, updates: Partial<BoundingBox>) => void;
  onDelete: (id: string) => void;
  customChars?: TamilChar[];
}

const STRIKED_OPTIONS: StrikedOut[] = ["none", "above line", "below line", "after", "before"];

function Toggle({
  label,
  checked,
  onChange,
}: {
  label: string;
  checked: boolean;
  onChange: (v: boolean) => void;
}) {
  return (
    <label className="flex items-center gap-2 cursor-pointer select-none">
      <div
        onClick={() => onChange(!checked)}
        className="relative w-8 h-4 rounded-full transition-colors flex-shrink-0"
        style={{ background: checked ? "#3B82F6" : "#334155" }}
      >
        <div
          className="absolute top-0.5 w-3 h-3 rounded-full bg-white transition-transform"
          style={{ left: checked ? "calc(100% - 14px)" : "2px" }}
        />
      </div>
      <span className="text-xs text-slate-300">{label}</span>
    </label>
  );
}

function Section({ title, icon, children }: { title: string; icon: React.ReactNode; children: React.ReactNode }) {
  const [open, setOpen] = useState(true);
  return (
    <div className="mb-1" style={{ borderBottom: "1px solid #1e293b" }}>
      <button
        onClick={() => setOpen(!open)}
        className="w-full flex items-center gap-2 px-3 py-2 hover:bg-slate-800/50 transition-colors"
      >
        <span className="text-slate-400">{icon}</span>
        <span className="text-xs text-slate-300 flex-1 text-left" style={{ fontWeight: 600, letterSpacing: 0.4 }}>
          {title}
        </span>
        <ChevronDown
          size={12}
          className="text-slate-500 transition-transform"
          style={{ transform: open ? "rotate(0deg)" : "rotate(-90deg)" }}
        />
      </button>
      {open && <div className="px-3 pb-3">{children}</div>}
    </div>
  );
}

export function PropertiesPanel({ bbox, imageMeta, onUpdate, onDelete }: Props) {
  if (!bbox) {
    return (
      <div
        className="flex flex-col h-full"
        style={{ background: "#060f1e", borderLeft: "1px solid #1e293b" }}
      >
        <div className="px-3 py-3" style={{ borderBottom: "1px solid #1e293b" }}>
          <h2 className="text-sm text-slate-200" style={{ fontWeight: 600, letterSpacing: 0.3 }}>
            Properties
          </h2>
        </div>
        <div className="flex-1 flex flex-col items-center justify-center gap-3 text-slate-600">
          <Info size={28} />
          <p className="text-xs text-center px-4">
            Select a bounding box to edit its annotation properties
          </p>
        </div>

        {/* Image metadata */}
        {imageMeta && (
          <div className="px-3 py-3" style={{ borderTop: "1px solid #1e293b" }}>
            <div className="text-xs text-slate-500 mb-2" style={{ fontWeight: 600, letterSpacing: 0.3 }}>
              IMAGE METADATA
            </div>
            <div className="space-y-1">
              {[
                ["ID", imageMeta.image_id],
                ["Width", `${imageMeta.naturalWidth}px`],
                ["Height", `${imageMeta.naturalHeight}px`],
                ["DPI", `${imageMeta.dpi}`],
              ].map(([k, v]) => (
                <div key={k} className="flex justify-between text-xs">
                  <span className="text-slate-500">{k}</span>
                  <span className="text-slate-300 font-mono">{v}</span>
                </div>
              ))}
            </div>
          </div>
        )}
      </div>
    );
  }

  return (
    <div
      className="flex flex-col h-full overflow-y-auto"
      style={{ background: "#060f1e", borderLeft: "1px solid #1e293b", scrollbarWidth: "thin", scrollbarColor: "#334155 transparent" }}
    >
      {/* Header */}
      <div className="px-3 py-2.5 flex items-center gap-2" style={{ borderBottom: "1px solid #1e293b" }}>
        <div
          className="w-3 h-3 rounded-sm flex-shrink-0"
          style={{ background: bbox.color, border: `2px solid ${bbox.color}80` }}
        />
        <div className="flex-1 min-w-0">
          <div className="text-xs text-slate-200 font-mono truncate" style={{ fontWeight: 600 }}>
            {bbox.glyphId}
          </div>
        </div>
        <button
          onClick={() => onDelete(bbox.id)}
          title="Delete"
          className="text-slate-500 hover:text-red-400 p-1 rounded hover:bg-slate-800 transition-colors"
        >
          <Trash2 size={13} />
        </button>
      </div>

      {/* Bbox coordinates */}
      <Section title="BOUNDING BOX" icon={<Tag size={12} />}>
        <div className="grid grid-cols-2 gap-1.5 mt-1">
          {(["x", "y", "w", "h"] as const).map((key) => (
            <div key={key}>
              <label className="text-xs text-slate-500 block mb-0.5">{key.toUpperCase()}</label>
              <input
                type="number"
                value={bbox[key]}
                onChange={(e) =>
                  onUpdate(bbox.id, { [key]: parseInt(e.target.value) || 0 })
                }
                className="w-full px-2 py-1 rounded text-xs font-mono outline-none"
                style={{
                  background: "#0f172a",
                  border: "1px solid #334155",
                  color: "#e2e8f0",
                }}
              />
            </div>
          ))}
        </div>
      </Section>

      {/* Labels */}
      <Section title="LABELS" icon={<Tag size={12} />}>
        <div className="mt-1">
          {bbox.labels.length === 0 ? (
            <div className="text-xs text-slate-600 italic py-1">No labels — click characters on the left</div>
          ) : (
            <>
              {/* Separate custom folders from standard labels */}
              {(() => {
                const customFolders = bbox.labels.filter((l) => l.startsWith("FOLDER_"));
                const standardLabels = bbox.labels.filter((l) => !l.startsWith("FOLDER_"));

                return (
                  <div className="space-y-2">
                    {/* Custom Glyphs */}
                    {customFolders.length > 0 && (
                      <div>
                        <div className="flex items-center gap-1.5 mb-1.5">
                          <Folder size={10} className="text-blue-400" />
                          <span className="text-xs text-slate-500" style={{ fontWeight: 600, letterSpacing: 0.3 }}>
                            CUSTOM GLYPHS
                          </span>
                        </div>
                        <div className="flex flex-wrap gap-1.5">
                          {customFolders.map((lbl) => {
                            // Prefer Tamil character from registered custom data
                            const info = getLabelInfo(lbl);
                            const displayLabel = info?.char || lbl.replace("FOLDER_", "").replace(/_/g, " ");
                            return (
                              <div
                                key={lbl}
                                className="flex items-center gap-1 px-2 py-1 rounded text-xs"
                                style={{
                                  background: "#1e3a5f",
                                  color: "#93c5fd",
                                  border: "1px solid #3B82F6",
                                }}
                              >
                                <Folder size={11} />
                                <span style={{ fontWeight: 600, fontFamily: "'Noto Sans Tamil', serif", fontSize: 16 }}>{displayLabel}</span>
                                <button
                                  onClick={() =>
                                    onUpdate(bbox.id, { labels: bbox.labels.filter((l) => l !== lbl) })
                                  }
                                  className="text-slate-400 hover:text-red-400 transition-colors leading-none ml-0.5"
                                >
                                  ×
                                </button>
                              </div>
                            );
                          })}
                        </div>
                      </div>
                    )}

                    {/* Standard Character Labels */}
                    {standardLabels.length > 0 && (
                      <div>
                        {customFolders.length > 0 && (
                          <div className="flex items-center gap-1.5 mb-1.5">
                            <Tag size={10} className="text-slate-500" />
                            <span className="text-xs text-slate-500" style={{ fontWeight: 600, letterSpacing: 0.3 }}>
                              CHARACTER LABELS
                            </span>
                          </div>
                        )}
                        <div className="flex flex-wrap gap-1.5">
                          {standardLabels.map((lbl) => (
                            <div
                              key={lbl}
                              className="flex items-center gap-1 px-2 py-0.5 rounded text-xs font-mono"
                              style={{ background: "#1e293b", color: "#93c5fd", border: "1px solid #334155" }}
                            >
                              <span style={{ fontFamily: "monospace" }}>{lbl}</span>
                              <button
                                onClick={() =>
                                  onUpdate(bbox.id, { labels: bbox.labels.filter((l) => l !== lbl) })
                                }
                                className="text-slate-500 hover:text-red-400 transition-colors leading-none"
                              >
                                ×
                              </button>
                            </div>
                          ))}
                        </div>
                      </div>
                    )}
                  </div>
                );
              })()}
            </>
          )}
          {bbox.labels.length > 1 && (
            <div
              className="flex items-center gap-1.5 px-2 py-1.5 rounded text-xs mt-2"
              style={{ background: "#172033", border: "1px solid #1e3a5f", color: "#93c5fd" }}
            >
              <AlertTriangle size={10} />
              Multi-label detected — proofread recommended
            </div>
          )}
        </div>
      </Section>

      {/* Variant */}
      <Section title="VARIANT" icon={<Info size={12} />}>
        <div className="space-y-2.5 mt-1">
          <Toggle
            label="Elongated stroke"
            checked={bbox.variant.elongated}
            onChange={(v) =>
              onUpdate(bbox.id, { variant: { ...bbox.variant, elongated: v } })
            }
          />
          <Toggle
            label="Broken glyph"
            checked={bbox.variant.broken}
            onChange={(v) =>
              onUpdate(bbox.id, { variant: { ...bbox.variant, broken: v } })
            }
          />
          <div>
            <label className="text-xs text-slate-500 block mb-1">Striked-out</label>
            <select
              value={bbox.variant.striked_out}
              onChange={(e) =>
                onUpdate(bbox.id, {
                  variant: { ...bbox.variant, striked_out: e.target.value as StrikedOut },
                })
              }
              className="w-full px-2 py-1.5 rounded text-xs outline-none"
              style={{
                background: "#0f172a",
                border: "1px solid #334155",
                color: "#e2e8f0",
                appearance: "none",
              }}
            >
              {STRIKED_OPTIONS.map((o) => (
                <option key={o} value={o}>
                  {o === "none" ? "None" : o}
                </option>
              ))}
            </select>
          </div>
        </div>
      </Section>


      {/* Confidence */}
      <Section title="CONFIDENCE" icon={<Info size={12} />}>
        <div className="mt-1">
          <div className="flex justify-between items-center mb-1.5">
            <span className="text-xs text-slate-500">Score</span>
            <span className="text-xs text-slate-200 font-mono">{bbox.confidence.toFixed(2)}</span>
          </div>
          <input
            type="range"
            min={0}
            max={1}
            step={0.05}
            value={bbox.confidence}
            onChange={(e) => onUpdate(bbox.id, { confidence: parseFloat(e.target.value) })}
            className="w-full accent-blue-500"
            style={{ cursor: "pointer" }}
          />
          <div className="flex justify-between text-xs text-slate-600 mt-0.5">
            <span>0.0</span>
            <span>0.5</span>
            <span>1.0</span>
          </div>
          <p className="text-xs text-slate-600 mt-1">Default 1.0 (manual annotation)</p>
        </div>
      </Section>
    </div>
  );
}
