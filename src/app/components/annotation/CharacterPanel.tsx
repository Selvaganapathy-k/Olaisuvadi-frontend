import React, { useState } from "react";
import { TamilChar, TamilCharVariant, BoundingBox } from "./types";
import { TAMIL_GROUPS, getLabelInfo } from "./tamilData";
import { ChevronDown, ChevronRight, Clock, FolderPlus, Folder, Trash2 } from "lucide-react";

interface Props {
  selectedBBoxId: string | null;
  selectedLabels: string[];
  allBBoxes: BoundingBox[];
  onAddLabel: (label: string) => void;
  onRemoveLabel: (label: string) => void;
  customChars: TamilChar[];              // user-defined characters/folders
  onCreateCustomChar: (char: TamilChar) => void; // notify parent of new entry
  onDeleteCustomChar: (label: string) => void;
}

function normalizeText(value: string): string {
  return value.toLowerCase().trim();
}

function isSubsequenceMatch(query: string, target: string): boolean {
  let qi = 0;
  for (let ti = 0; ti < target.length && qi < query.length; ti += 1) {
    if (target[ti] === query[qi]) qi += 1;
  }
  return qi === query.length;
}

function levenshteinDistance(a: string, b: string): number {
  const dp = Array.from({ length: a.length + 1 }, () => new Array<number>(b.length + 1).fill(0));
  for (let i = 0; i <= a.length; i += 1) dp[i][0] = i;
  for (let j = 0; j <= b.length; j += 1) dp[0][j] = j;

  for (let i = 1; i <= a.length; i += 1) {
    for (let j = 1; j <= b.length; j += 1) {
      const cost = a[i - 1] === b[j - 1] ? 0 : 1;
      dp[i][j] = Math.min(
        dp[i - 1][j] + 1,     // deletion
        dp[i][j - 1] + 1,     // insertion
        dp[i - 1][j - 1] + cost // substitution
      );
    }
  }
  return dp[a.length][b.length];
}

function fuzzyMatch(queryRaw: string, targetRaw: string): boolean {
  const query = normalizeText(queryRaw);
  const target = normalizeText(targetRaw);
  if (!query) return true;
  if (!target) return false;
  if (target.includes(query)) return true;
  if (isSubsequenceMatch(query, target)) return true;

  // Small typo tolerance
  const maxDistance = query.length <= 4 ? 1 : 2;
  return levenshteinDistance(query, target) <= maxDistance;
}

function VariantBadge({
  variant,
  selected,
  onClick,
}: {
  variant: TamilCharVariant;
  selected: boolean;
  onClick: () => void;
}) {
  return (
    <button
      onClick={onClick}
      title={`${variant.description}${variant.period ? ` — ${variant.period}` : ""}`}
      className="flex items-center gap-1 px-2 py-0.5 rounded text-xs transition-colors"
      style={{
        background: selected ? "#3B82F6" : "#1e293b",
        color: selected ? "#fff" : "#94a3b8",
        border: `1px solid ${selected ? "#3B82F6" : "#334155"}`,
        cursor: "pointer",
        fontFamily: "monospace",
      }}
    >
      {variant.period && <Clock size={9} />}
      <span>{variant.label}</span>
    </button>
  );
}

function CharRow({
  char,
  selectedLabels,
  onAddLabel,
  onRemoveLabel,
  disabled,
  onDelete,
  isMultiSelectMode,
  isMultiSelected,
  onMultiSelectToggle,
}: {
  char: TamilChar;
  selectedLabels: string[];
  onAddLabel: (label: string) => void;
  onRemoveLabel: (label: string) => void;
  disabled: boolean;
  onDelete?: () => void;
  isMultiSelectMode?: boolean;
  isMultiSelected?: boolean;
  onMultiSelectToggle?: () => void;
}) {
  const [expanded, setExpanded] = useState(false);
  const mainSelected = selectedLabels.includes(char.label);

  const handleMainClick = () => {
    if (isMultiSelectMode && onMultiSelectToggle) {
      onMultiSelectToggle();
      return;
    }
    if (disabled) return;
    if (mainSelected) {
      onRemoveLabel(char.label);
    } else {
      onAddLabel(char.label);
    }
  };

  return (
    <div className="rounded-lg overflow-hidden" style={{ border: "1px solid #1e293b", marginBottom: 4 }}>
      <div
        className="flex items-center gap-2 px-3 py-2 cursor-pointer select-none transition-colors"
        style={{
          background: isMultiSelectMode && isMultiSelected ? "#1e3a5f" : mainSelected ? "#1e3a5f" : "#0f172a",
          opacity: disabled && !isMultiSelectMode ? 0.5 : 1,
        }}
        onClick={handleMainClick}
      >
        <span
          className="text-xl w-8 text-center"
          style={{ fontFamily: "'Noto Sans Tamil', serif", lineHeight: 1.2, color: "#f1f5f9" }}
        >
          {char.char}
        </span>
        <div className="flex-1 min-w-0">
          <div className="text-xs text-slate-300" style={{ fontWeight: 500 }}>
            {char.name}
          </div>
          <div className="text-xs text-slate-500 font-mono">{char.label}</div>
        </div>
        {isMultiSelectMode ? (
          isMultiSelected && (
            <div
              className="w-4 h-4 rounded-full flex items-center justify-center"
              style={{ background: "#3B82F6", flexShrink: 0 }}
            >
              <svg width="8" height="8" viewBox="0 0 8 8" fill="white">
                <path d="M1 4l2 2 4-4" stroke="white" strokeWidth="1.5" fill="none" strokeLinecap="round" strokeLinejoin="round" />
              </svg>
            </div>
          )
        ) : (
          mainSelected && (
            <div
              className="w-4 h-4 rounded-full flex items-center justify-center"
              style={{ background: "#3B82F6", flexShrink: 0 }}
            >
              <svg width="8" height="8" viewBox="0 0 8 8" fill="white">
                <path d="M1 4l2 2 4-4" stroke="white" strokeWidth="1.5" fill="none" strokeLinecap="round" strokeLinejoin="round" />
              </svg>
            </div>
          )
        )}
        {onDelete && !isMultiSelectMode && (
          <button
            onClick={(e) => {
              e.stopPropagation();
              onDelete();
            }}
            className="text-slate-500 hover:text-red-400 transition-colors"
            title="Delete custom glyph"
          >
            <Trash2 size={13} />
          </button>
        )}
        <button
          onClick={(e) => {
            e.stopPropagation();
            setExpanded(!expanded);
          }}
          className="text-slate-500 hover:text-slate-300 transition-colors"
          title="Show variants"
        >
          {expanded ? <ChevronDown size={14} /> : <ChevronRight size={14} />}
        </button>
      </div>

      {expanded && (
        <div className="px-3 py-2 flex flex-wrap gap-1.5" style={{ background: "#0a1525", borderTop: "1px solid #1e293b" }}>
          <div className="w-full text-xs text-slate-500 mb-1 flex items-center gap-1">
            <Clock size={10} />
            Historical Variants
          </div>
          {char.variants.map((v) => {
            const vSelected = selectedLabels.includes(v.label);
            return (
              <VariantBadge
                key={v.label}
                variant={v}
                selected={vSelected}
                onClick={() => {
                  if (disabled) return;
                  if (vSelected) onRemoveLabel(v.label);
                  else onAddLabel(v.label);
                }}
              />
            );
          })}
        </div>
      )}
    </div>
  );
}

export function CharacterPanel({ selectedBBoxId, selectedLabels, allBBoxes, onAddLabel, onRemoveLabel, customChars, onCreateCustomChar, onDeleteCustomChar }: Props) {
  const [expandedGroups, setExpandedGroups] = useState<Set<string>>(
    new Set([TAMIL_GROUPS[0].group, TAMIL_GROUPS[1].group])
  );
  const [search, setSearch] = useState("");
  const [showFolderInput, setShowFolderInput] = useState(false);
  const [multiSelectMode, setMultiSelectMode] = useState(false);
  const [multiSelected, setMultiSelected] = useState<Set<string>>(new Set());
  // inputs for custom folder creation
  const [customFolderTamilChar, setCustomFolderTamilChar] = useState("");
  const [customFolderSound, setCustomFolderSound] = useState("");

  const toggleGroup = (group: string) => {
    setExpandedGroups((prev) => {
      const next = new Set(prev);
      if (next.has(group)) next.delete(group);
      else next.add(group);
      return next;
    });
  };

  const disabled = !selectedBBoxId;

  const filterChar = (char: TamilChar) => {
    if (!search) return true;
    return (
      fuzzyMatch(search, char.char) ||
      fuzzyMatch(search, char.name) ||
      fuzzyMatch(search, char.label) ||
      char.variants.some((v) => fuzzyMatch(search, v.label) || fuzzyMatch(search, v.description))
    );
  };

  const handleCreateCustomFolder = () => {
    if (!customFolderTamilChar.trim() || !customFolderSound.trim()) return;

    // generate label from the english sound (unique, uppercase)
    const customLabel = `FOLDER_${customFolderSound.trim().replace(/\s+/g, "_").toUpperCase()}`;

    const newChar: TamilChar = {
      char: customFolderTamilChar.trim(),
      name: customFolderSound.trim(),
      label: customLabel,
      variants: [],
    };
    onCreateCustomChar(newChar);
    if (selectedBBoxId) {
      onAddLabel(customLabel);
    }

    // Reset inputs and close
    setCustomFolderTamilChar("");
    setCustomFolderSound("");
    setShowFolderInput(false);
  };
  // Toggle item in multi-select mode
  const toggleMultiSelect = (label: string) => {
    setMultiSelected((prev) => {
      const next = new Set(prev);
      if (next.has(label)) {
        next.delete(label);
      } else {
        next.add(label);
      }
      return next;
    });
  };

  // Delete selected custom chars in bulk
  const handleBulkDelete = () => {
    if (multiSelected.size === 0) return;
    const confirmed = window.confirm(
      `Delete ${multiSelected.size} custom glyph(s)? This will also remove them from all labels.`
    );
    if (!confirmed) return;
    
    multiSelected.forEach((label) => {
      onDeleteCustomChar(label);
    });
    setMultiSelected(new Set());
  };
  // Extract any folder labels that were applied to bboxes but for which we
  // don’t yet have metadata (e.g. imported annotations). They will remain in a
  // separate section with a folder icon.
  const orphanFolders = React.useMemo(() => {
    const set = new Set<string>();
    if (allBBoxes && Array.isArray(allBBoxes)) {
      allBBoxes.forEach((bbox) => {
        bbox.labels.forEach((label) => {
          if (label.startsWith("FOLDER_") && !customChars.find((c) => c.label === label)) {
            set.add(label);
          }
        });
      });
    }
    return Array.from(set).sort();
  }, [allBBoxes, customChars]);

  return (
    <div
      className="flex flex-col h-full"
      style={{ background: "#060f1e", borderRight: "1px solid #1e293b" }}
    >
      {/* Header */}
      <div className="px-3 py-3" style={{ borderBottom: "1px solid #1e293b" }}>
        <div className="flex items-center justify-between mb-2">
          <h2 className="text-sm text-slate-200" style={{ fontWeight: 600, letterSpacing: 0.3 }}>
            Tamil Characters / தமிழ் எழுத்துக்கள்
          </h2>
          <button
            onClick={() => setMultiSelectMode(!multiSelectMode)}
            disabled={customChars.length === 0}
            className="text-xs px-2 py-1 rounded transition-colors"
            style={{
              background: multiSelectMode && customChars.length > 0 ? "#3B82F6" : "#1e293b",
              color: multiSelectMode && customChars.length > 0 ? "#fff" : "#94a3b8",
              border: multiSelectMode && customChars.length > 0 ? "1px solid #3B82F6" : "1px solid #334155",
              cursor: customChars.length > 0 ? "pointer" : "not-allowed",
              opacity: customChars.length > 0 ? 1 : 0.5,
            }}
          >
            {multiSelectMode ? "Done" : "Edit"}
          </button>
        </div>
        <input
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          placeholder="Search character or label…"
          className="w-full px-2.5 py-1.5 rounded text-xs outline-none"
          style={{
            background: "#0f172a",
            border: "1px solid #334155",
            color: "#e2e8f0",
          }}
        />
        {disabled && (
          <div
            className="mt-2 px-2 py-1.5 rounded text-xs text-yellow-300"
            style={{ background: "#422006", border: "1px solid #78350f" }}
          >
            Select a bounding box first to assign labels
          </div>
        )}
      </div>

      {/* Multi-select delete bar */}
      {multiSelectMode && multiSelected.size > 0 && (
        <div className="px-3 py-2 flex items-center justify-between" style={{ background: "#1e3a5f", borderBottom: "1px solid #3B82F6" }}>
          <span className="text-xs text-slate-300">
            {multiSelected.size} selected
          </span>
          <div className="flex gap-2">
            <button
              onClick={handleBulkDelete}
              className="text-xs px-3 py-1 rounded transition-colors"
              style={{
                background: "#dc2626",
                color: "#fff",
                border: "1px solid #991b1b",
                cursor: "pointer",
              }}
            >
              Delete Selected
            </button>
            <button
              onClick={() => setMultiSelected(new Set())}
              className="text-xs px-3 py-1 rounded transition-colors"
              style={{
                background: "#1e293b",
                color: "#94a3b8",
                border: "1px solid #334155",
                cursor: "pointer",
              }}
            >
              Clear
            </button>
          </div>
        </div>
      )}

      {/* Custom Glyph Section - form to create new metadata-rich glyph */}
      <div className="px-3 py-2" style={{ borderBottom: "1px solid #1e293b", background: "#0a1525" }}>
        {!showFolderInput ? (
          <button
            onClick={() => setShowFolderInput(true)}
            className="w-full flex items-center gap-2 px-2.5 py-2 rounded text-xs transition-colors"
            style={{
              background: "#1e3a5f",
              color: "#60a5fa",
              border: "1px solid #3B82F6",
              cursor: "pointer",
              opacity: 1,
            }}
          >
            <FolderPlus size={14} />
            <span style={{ fontWeight: 600, letterSpacing: 0.3 }}>CREATE CUSTOM GLYPH</span>
          </button>
        ) : (
          <div className="space-y-2">
            <div className="flex items-center gap-2">
              <Folder size={14} className="text-blue-400 flex-shrink-0" />
              <span className="text-xs text-slate-300" style={{ fontWeight: 600 }}>
                New Folder
              </span>
            </div>
            <input
              autoFocus
              value={customFolderTamilChar}
              onChange={(e) => setCustomFolderTamilChar(e.target.value)}
              placeholder="Tamil character (e.g. அ)"
              className="w-full px-2.5 py-1.5 rounded text-xs outline-none"
              style={{
                background: "#0f172a",
                border: "1px solid #3B82F6",
                color: "#e2e8f0",
              }}
            />
            <input
              value={customFolderSound}
              onChange={(e) => setCustomFolderSound(e.target.value)}
              placeholder="English sound/name"
              className="w-full px-2.5 py-1.5 rounded text-xs outline-none"
              style={{
                background: "#0f172a",
                border: "1px solid #3B82F6",
                color: "#e2e8f0",
              }}
              onKeyDown={(e) => {
                if (e.key === "Enter") handleCreateCustomFolder();
                if (e.key === "Escape") {
                  setShowFolderInput(false);
                  setCustomFolderTamilChar("");
                  setCustomFolderSound("");
                }
              }}
            />
            <div className="flex gap-2">
              <button
                onClick={handleCreateCustomFolder}
                disabled={!customFolderTamilChar.trim() || !customFolderSound.trim()}
                className="flex-1 px-2 py-1.5 rounded text-xs transition-colors"
                style={{
                  background: customFolderTamilChar.trim() && customFolderSound.trim() ? "#3B82F6" : "#1e293b",
                  color: customFolderTamilChar.trim() && customFolderSound.trim() ? "#fff" : "#64748b",
                  fontWeight: 600,
                  cursor: customFolderTamilChar.trim() && customFolderSound.trim() ? "pointer" : "not-allowed",
                }}
              >
                {selectedBBoxId ? "Create & Assign" : "Create"}
              </button>
              <button
                onClick={() => {
                  setShowFolderInput(false);
                  setCustomFolderTamilChar("");
                  setCustomFolderSound("");
                }}
                className="px-2 py-1.5 rounded text-xs transition-colors"
                style={{
                  background: "#1e293b",
                  color: "#94a3b8",
                  fontWeight: 600,
                }}
              >
                Cancel
              </button>
            </div>
            <div className="text-xs text-slate-600">
              Fill both fields, Enter to create, Esc to cancel
              {!selectedBBoxId ? " (select a box to auto-assign)" : ""}
            </div>
          </div>
        )}
      </div>

      {/* Character list */}
      <div className="flex-1 overflow-y-auto px-2 py-2" style={{ scrollbarWidth: "thin", scrollbarColor: "#334155 transparent" }}>
        {/* Custom folders added by user – treated just like regular characters */}
        {customChars.length > 0 && (
          <div className="mb-3">
            <div className="text-xs text-slate-400 mb-1">Custom Glyphs</div>
            {customChars.filter(filterChar).map((char) => (
              <CharRow
                key={char.label}
                char={char}
                selectedLabels={selectedLabels}
                onAddLabel={onAddLabel}
                onRemoveLabel={onRemoveLabel}
                disabled={disabled || multiSelectMode}
                isMultiSelectMode={multiSelectMode}
                isMultiSelected={multiSelected.has(char.label)}
                onMultiSelectToggle={() => toggleMultiSelect(char.label)}
                onDelete={() => {
                  const ok = window.confirm(`Delete custom glyph "${char.name}"?`);
                  if (ok) onDeleteCustomChar(char.label);
                }}
              />
            ))}
          </div>
        )}
        {/* Any orphan folder labels (no metadata) still rendered separately */}
        {orphanFolders.length > 0 && (
          <div className="mb-3">
            <button
              onClick={() => toggleGroup("Custom Glyphs")}
              className="w-full flex items-center gap-2 px-2 py-1.5 rounded mb-1 transition-colors hover:bg-slate-800"
              style={{ background: "transparent" }}
            >
              <Folder size={16} className="text-blue-400" />
              <span className="text-xs text-slate-400 flex-1 text-left" style={{ fontWeight: 600 }}>
                Custom Glyphs
              </span>
              <span className="text-xs text-slate-600">({orphanFolders.length})</span>
              {expandedGroups.has("Custom Glyphs") ? (
                <ChevronDown size={12} className="text-slate-500" />
              ) : (
                <ChevronRight size={12} className="text-slate-500" />
              )}
            </button>
            {expandedGroups.has("Custom Glyphs") &&
              orphanFolders.map((folderLabel) => {
                const info = getLabelInfo(folderLabel);
                // Show Tamil char if available, else fallback to English name derived from label
                const displayName = info?.char || folderLabel.replace("FOLDER_", "").replace(/_/g, " ");
                const isSelected = selectedLabels.includes(folderLabel);
                return (
                  <div
                    key={folderLabel}
                    className="rounded-lg overflow-hidden"
                    style={{ border: "1px solid #1e293b", marginBottom: 4 }}
                  >
                    <div
                      className="flex items-center gap-2 px-3 py-2 cursor-pointer select-none transition-colors"
                      style={{
                        background: isSelected ? "#1e3a5f" : "#0f172a",
                        opacity: disabled ? 0.5 : 1,
                      }}
                      onClick={() => {
                        if (disabled) return;
                        if (isSelected) {
                          onRemoveLabel(folderLabel);
                        } else {
                          onAddLabel(folderLabel);
                        }
                      }}
                    >
                      <Folder size={18} className="text-blue-400 flex-shrink-0" />
                      <div className="flex-1 min-w-0">
                        <div
                          className="text-xs text-slate-300"
                          style={{ fontWeight: 500, fontFamily: "'Noto Sans Tamil', serif", fontSize: 18 }}
                        >
                          {displayName}
                        </div>
                        <div className="text-xs text-slate-500 font-mono">{folderLabel}</div>
                      </div>
                      {isSelected && (
                        <div
                          className="w-4 h-4 rounded-full flex items-center justify-center"
                          style={{ background: "#3B82F6", flexShrink: 0 }}
                        >
                          <svg width="8" height="8" viewBox="0 0 8 8" fill="white">
                            <path d="M1 4l2 2 4-4" stroke="white" strokeWidth="1.5" fill="none" strokeLinecap="round" strokeLinejoin="round" />
                          </svg>
                        </div>
                      )}
                    </div>
                  </div>
                );
              })}
          </div>
        )}

        {/* Standard Tamil Character Groups */}
        {TAMIL_GROUPS.map((group) => {
          const filteredChars = group.chars.filter(filterChar);
          if (filteredChars.length === 0) return null;
          const isOpen = expandedGroups.has(group.group) || !!search;

          return (
            <div key={group.group} className="mb-3">
              <button
                onClick={() => toggleGroup(group.group)}
                className="w-full flex items-center gap-2 px-2 py-1.5 rounded mb-1 transition-colors hover:bg-slate-800"
                style={{ background: "transparent" }}
              >
                <span className="text-base" style={{ fontFamily: "'Noto Sans Tamil', serif" }}>
                  {group.icon}
                </span>
                <span className="text-xs text-slate-400 flex-1 text-left" style={{ fontWeight: 600 }}>
                  {group.group}
                </span>
                <span className="text-xs text-slate-600">({filteredChars.length})</span>
                {isOpen ? (
                  <ChevronDown size={12} className="text-slate-500" />
                ) : (
                  <ChevronRight size={12} className="text-slate-500" />
                )}
              </button>
              {isOpen &&
                filteredChars.map((char) => (
                  <CharRow
                    key={char.label}
                    char={char}
                    selectedLabels={selectedLabels}
                    onAddLabel={onAddLabel}
                    onRemoveLabel={onRemoveLabel}
                    disabled={disabled}
                  />
                ))}
            </div>
          );
        })}
      </div>
    </div>
  );
}
