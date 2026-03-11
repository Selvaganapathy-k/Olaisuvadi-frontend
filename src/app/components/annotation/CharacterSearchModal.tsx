import React, { useState, useEffect, useRef } from "react";
import { TAMIL_GROUPS, getLabelInfo } from "./tamilData";
import { TamilChar } from "./types";
import { Search, X, Sparkles } from "lucide-react";

interface Props {
  isOpen: boolean;
  onSelectCharacter: (label: string) => void;
  onClose: () => void;
  // additional characters (e.g. user-defined folders) to include in search
  extraChars?: TamilChar[];
  recommendationEnabled?: boolean;
  recommendedLabel?: string | null;
  recommendedScore?: number | null;
  onAcceptRecommendation?: () => void;
}

export function CharacterSearchModal({
  isOpen,
  onSelectCharacter,
  onClose,
  extraChars,
  recommendationEnabled = true,
  recommendedLabel = null,
  recommendedScore = null,
  onAcceptRecommendation,
}: Props) {
  const [search, setSearch] = useState("");
  const [results, setResults] = useState<Array<{ char: TamilChar; group: string }>>([]);
  const [selectedIndex, setSelectedIndex] = useState(0);
  const inputRef = useRef<HTMLInputElement>(null);

  // Search characters
  useEffect(() => {
    if (!search.trim()) {
      setResults([]);
      setSelectedIndex(0);
      return;
    }

    const query = search.toLowerCase().trim();
    const found: Array<{ char: TamilChar; group: string }> = [];
    const seen = new Set<string>();

    // Split by spaces to support multi-character search (e.g., "na ka va ga")
    const searchTerms = query.split(/\s+/).filter(t => t.length > 0);

    TAMIL_GROUPS.forEach((group) => {
      group.chars.forEach((char) => {
        const charName = char.name.toLowerCase();
        const charLabel = char.label.toLowerCase();
        
        // Match all search terms (AND logic)
        const matchesAny = searchTerms.some(term =>
          char.char.includes(search) ||
          charName.includes(term) ||
          charLabel.includes(term) ||
          char.variants.some(v => v.label.toLowerCase().includes(term) || v.description.toLowerCase().includes(term))
        );

        if (matchesAny && !seen.has(char.label)) {
          found.push({ char, group: group.group });
          seen.add(char.label);
        }
      });
    });

    if (extraChars) {
      extraChars.forEach((char) => {
        const charName = char.name.toLowerCase();
        const charLabel = char.label.toLowerCase();
        
        const matchesAny = searchTerms.some(term =>
          char.char.includes(search) ||
          charName.includes(term) ||
          charLabel.includes(term)
        );

        if (matchesAny && !seen.has(char.label)) {
          found.push({ char, group: "Custom" });
          seen.add(char.label);
        }
      });
    }

    setResults(found);
    setSelectedIndex(0);
  }, [search, extraChars]);

  // Focus input when modal opens
  useEffect(() => {
    if (isOpen) {
      setSearch("");
      setResults([]);
      setSelectedIndex(0);
      setTimeout(() => inputRef.current?.focus(), 0);
    }
  }, [isOpen]);

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === "ArrowDown") {
      e.preventDefault();
      setSelectedIndex((prev) => (prev + 1) % Math.max(results.length, 1));
    } else if (e.key === "ArrowUp") {
      e.preventDefault();
      setSelectedIndex((prev) => (prev - 1 + Math.max(results.length, 1)) % Math.max(results.length, 1));
    } else if (e.key === "Enter") {
      e.preventDefault();
      if (!search.trim() && recommendationEnabled && recommendedLabel) {
        if (onAcceptRecommendation) onAcceptRecommendation();
        else {
          onSelectCharacter(recommendedLabel);
          onClose();
        }
        return;
      }
      if (results.length > 0) {
        const selected = results[selectedIndex];
        onSelectCharacter(selected.char.label);
        setSearch("");
        onClose();
      }
    } else if (e.key === "Escape") {
      e.preventDefault();
      onClose();
    }
  };

  if (!isOpen) return null;

  const recommendationInfo = recommendedLabel ? getLabelInfo(recommendedLabel) : null;
  const recommendationPercent = recommendedScore != null ? `${Math.round(recommendedScore * 100)}%` : null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center" style={{ background: "rgba(0, 0, 0, 0.5)" }}>
      <div
        className="w-96 rounded-lg shadow-2xl overflow-hidden"
        style={{ background: "#0f1729", border: "1px solid #1e293b" }}
      >
        {/* Header */}
        <div className="px-4 py-3 flex items-center gap-3" style={{ borderBottom: "1px solid #1e293b" }}>
          <Search size={18} style={{ color: "#64748b" }} />
          <input
            ref={inputRef}
            type="text"
            placeholder="Search character name or label (e.g., 'TA', 'அ')..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            onKeyDown={handleKeyDown}
            className="flex-1 bg-transparent text-sm outline-none"
            style={{ color: "#e2e8f0" }}
          />
          <button
            onClick={onClose}
            className="text-slate-500 hover:text-slate-300 transition-colors"
          >
            <X size={18} />
          </button>
        </div>

        {/* Results */}
        <div className="max-h-96 overflow-y-auto">
          {!recommendationEnabled && (
            <div
              className="px-4 py-2 text-xs"
              style={{ background: "#1f2937", color: "#f59e0b", borderBottom: "1px solid #1e293b" }}
            >
              Recommendations are disabled (toggle Reco On in toolbar).
            </div>
          )}
          {recommendationEnabled && !recommendedLabel && !search.trim() && (
            <div
              className="px-4 py-2 text-xs"
              style={{ background: "#0f172a", color: "#94a3b8", borderBottom: "1px solid #1e293b" }}
            >
              Recommendation unavailable. Label a few boxes first for better suggestions.
            </div>
          )}
          {recommendationEnabled && recommendedLabel && (
            <button
              onClick={() => {
                if (onAcceptRecommendation) onAcceptRecommendation();
                else {
                  onSelectCharacter(recommendedLabel);
                  onClose();
                }
              }}
              className="w-full px-4 py-2 text-left flex items-center gap-3 transition-colors text-sm"
              style={{
                background: "#10243f",
                borderBottom: "1px solid #1e293b",
                color: "#e2e8f0",
              }}
            >
              <Sparkles size={16} className="text-amber-300 flex-shrink-0" />
              <span
                className="text-2xl w-8 text-center flex-shrink-0"
                style={{ fontFamily: "'Noto Sans Tamil', serif" }}
              >
                {recommendationInfo?.char || "?"}
              </span>
              <div className="flex-1 min-w-0">
                <div style={{ color: "#cbd5e1", fontWeight: 600 }}>
                  Recommendation: {recommendationInfo?.charName || recommendedLabel}
                </div>
                <div style={{ color: "#93c5fd", fontSize: "0.75rem" }}>
                  {recommendedLabel}
                  {recommendationPercent ? ` - similarity ${recommendationPercent}` : ""}
                  {" - press Enter to accept"}
                </div>
              </div>
            </button>
          )}
          {results.length === 0 ? (
            <div className="px-4 py-8 text-center text-slate-500 text-sm">
              {search ? "No characters found" : "Start typing to search for a character"}
            </div>
          ) : (
            results.map((item, idx) => (
              <button
                key={`${item.group}-${item.char.label}`}
                onClick={() => {
                  onSelectCharacter(item.char.label);
                  setSearch("");
                  onClose();
                }}
                onMouseEnter={() => setSelectedIndex(idx)}
                className="w-full px-4 py-2 text-left flex items-center gap-3 transition-colors text-sm"
                style={{
                  background: selectedIndex === idx ? "#1e3a5f" : "transparent",
                  borderBottom: "1px solid #1e293b",
                  color: "#e2e8f0",
                }}
              >
                <span
                  className="text-2xl w-8 text-center flex-shrink-0"
                  style={{ fontFamily: "'Noto Sans Tamil', serif" }}
                >
                  {item.char.char}
                </span>
                <div className="flex-1 min-w-0">
                  <div style={{ color: "#cbd5e1" }}>{item.char.name}</div>
                  <div style={{ color: "#64748b", fontSize: "0.75rem" }}>
                    {item.char.label} • {item.group}
                  </div>
                </div>
                <div
                  className="px-2 py-1 rounded text-xs"
                  style={{
                    background: "#1e293b",
                    color: "#94a3b8",
                    fontFamily: "monospace",
                  }}
                >
                  {item.char.label}
                </div>
              </button>
            ))
          )}
        </div>

        {/* Footer hint */}
        {(results.length > 0 || (recommendationEnabled && !!recommendedLabel)) && (
          <div
            className="px-4 py-2 text-xs flex items-center justify-between"
            style={{ background: "#060f1e", color: "#64748b", borderTop: "1px solid #1e293b" }}
          >
            <span>↓↑ Navigate • Enter Select • Esc Close</span>
          </div>
        )}
      </div>
    </div>
  );
}
