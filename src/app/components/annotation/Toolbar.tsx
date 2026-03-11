import React from "react";
import {
  MousePointer2,
  Square,
  Hand,
  ZoomIn,
  ZoomOut,
  Download,
  Trash2,
  RotateCcw,
  FileJson,
  Image as ImageIcon,
  Upload,
  Images,
  Search,
} from "lucide-react";
import { DrawingMode, BoundingBox } from "./types";

interface Props {
  mode: DrawingMode;
  zoom: number;
  bboxCount: number;
  selectedId: string | null;
  hasImage: boolean;
  imageName: string;
  onModeChange: (mode: DrawingMode) => void;
  onZoomIn: () => void;
  onZoomOut: () => void;
  onZoomReset: () => void;
  onExportYAML: () => void;
  onExportImages: () => void;
  recommendationEnabled: boolean;
  onToggleRecommendation: () => void;
  onClearAll: () => void;
  onDeleteSelected: () => void;
  onUploadClick: () => void;
}

function ToolBtn({
  icon,
  label,
  active,
  onClick,
  danger,
  disabled,
}: {
  icon: React.ReactNode;
  label: string;
  active?: boolean;
  onClick: () => void;
  danger?: boolean;
  disabled?: boolean;
}) {
  return (
    <button
      onClick={onClick}
      disabled={disabled}
      title={label}
      className="flex items-center gap-1.5 px-2.5 py-1.5 rounded text-xs transition-all"
      style={{
        background: active ? "#1d4ed8" : "transparent",
        color: active ? "#fff" : danger ? "#f87171" : disabled ? "#374151" : "#94a3b8",
        border: `1px solid ${active ? "#2563eb" : "transparent"}`,
        cursor: disabled ? "not-allowed" : "pointer",
      }}
      onMouseEnter={(e) => {
        if (!active && !disabled) {
          (e.currentTarget as HTMLButtonElement).style.background = "#1e293b";
          (e.currentTarget as HTMLButtonElement).style.color = danger ? "#f87171" : "#e2e8f0";
        }
      }}
      onMouseLeave={(e) => {
        if (!active && !disabled) {
          (e.currentTarget as HTMLButtonElement).style.background = "transparent";
          (e.currentTarget as HTMLButtonElement).style.color = danger ? "#f87171" : "#94a3b8";
        }
      }}
    >
      {icon}
      <span className="hidden lg:inline">{label}</span>
    </button>
  );
}

function Divider() {
  return <div className="w-px h-6 mx-1" style={{ background: "#1e293b" }} />;
}

export function Toolbar({
  mode,
  zoom,
  bboxCount,
  selectedId,
  hasImage,
  imageName,
  onModeChange,
  onZoomIn,
  onZoomOut,
  onZoomReset,
  onExportYAML,
  onExportImages,
  recommendationEnabled,
  onToggleRecommendation,
  onClearAll,
  onDeleteSelected,
  onUploadClick,
}: Props) {
  return (
    <div
      className="flex items-center gap-1 px-3 h-11 flex-shrink-0"
      style={{
        background: "#060f1e",
        borderBottom: "1px solid #1e293b",
      }}
    >
      {/* Brand */}
      <div className="flex items-center gap-2 mr-3">
        <div className="w-6 h-6 rounded flex items-center justify-center" style={{ background: "#1d4ed8" }}>
          <svg width="14" height="14" viewBox="0 0 14 14" fill="none">
            <rect x="1" y="1" width="5" height="5" stroke="#fff" strokeWidth="1.2" rx="0.5" />
            <rect x="8" y="1" width="5" height="5" stroke="#60a5fa" strokeWidth="1.2" rx="0.5" />
            <rect x="1" y="8" width="5" height="5" stroke="#34d399" strokeWidth="1.2" rx="0.5" />
            <rect x="8" y="8" width="5" height="5" stroke="#f472b6" strokeWidth="1.2" rx="0.5" />
          </svg>
        </div>
        <span className="text-sm text-slate-200 hidden md:block" style={{ fontWeight: 600, letterSpacing: 0.3 }}>
          குறிப்பாளர்
        </span>
      </div>

      <Divider />

      {/* Upload */}
      <ToolBtn
        icon={<Upload size={14} />}
        label="Load Image"
        onClick={onUploadClick}
      />

      {hasImage && (
        <>
          <div className="flex items-center gap-1 px-2 py-1 rounded text-xs text-slate-500" style={{ background: "#0f172a", border: "1px solid #1e293b", maxWidth: 180 }}>
            <ImageIcon size={11} />
            <span className="truncate" title={imageName}>{imageName}</span>
          </div>
        </>
      )}

      <Divider />

      {/* Drawing tools */}
      <ToolBtn
        icon={<Square size={14} />}
        label="Draw BBox"
        active={mode === "draw"}
        onClick={() => onModeChange("draw")}
        disabled={!hasImage}
      />
      <ToolBtn
        icon={<MousePointer2 size={14} />}
        label="Select"
        active={mode === "select"}
        onClick={() => onModeChange("select")}
        disabled={!hasImage}
      />
      <ToolBtn
        icon={<Hand size={14} />}
        label="Pan"
        active={mode === "pan"}
        onClick={() => onModeChange("pan")}
        disabled={!hasImage}
      />

      <Divider />

      {/* Zoom */}
      <ToolBtn icon={<ZoomOut size={14} />} label="Zoom Out" onClick={onZoomOut} disabled={!hasImage} />
      <button
        onClick={onZoomReset}
        disabled={!hasImage}
        className="px-2 py-1 rounded text-xs font-mono transition-colors"
        style={{
          background: "#0f172a",
          color: hasImage ? "#94a3b8" : "#374151",
          border: "1px solid #1e293b",
          cursor: hasImage ? "pointer" : "not-allowed",
          minWidth: 44,
        }}
        title="Reset zoom"
      >
        {Math.round(zoom * 100)}%
      </button>
      <ToolBtn icon={<ZoomIn size={14} />} label="Zoom In" onClick={onZoomIn} disabled={!hasImage} />

      <div className="flex-1" />

      {/* Stats */}
      {hasImage && (
        <div className="flex items-center gap-1.5 px-2.5 py-1 rounded text-xs" style={{ background: "#0f172a", border: "1px solid #1e293b", color: "#60a5fa" }}>
          <Square size={11} />
          <span className="font-mono">{bboxCount} glyphs</span>
        </div>
      )}

      <Divider />

      {/* Actions */}
      {selectedId && (
        <ToolBtn
          icon={<Trash2 size={14} />}
          label="Delete"
          onClick={onDeleteSelected}
          danger
        />
      )}
      <ToolBtn
        icon={<RotateCcw size={14} />}
        label="Clear All"
        onClick={onClearAll}
        disabled={bboxCount === 0}
        danger
      />
      <ToolBtn
        icon={<FileJson size={14} />}
        label="Export YAML"
        onClick={onExportYAML}
        disabled={!hasImage}
      />
      <ToolBtn
        icon={<Images size={14} />}
        label="Export Images"
        onClick={onExportImages}
        disabled={!hasImage}
      />
      <ToolBtn
        icon={<Search size={14} />}
        label={recommendationEnabled ? "Reco On" : "Reco Off"}
        active={recommendationEnabled}
        onClick={onToggleRecommendation}
        disabled={!hasImage}
      />
    </div>
  );
}
