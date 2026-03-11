import { TamilGroup, TamilChar } from "./types";

export const BBOX_COLORS = [
  "#EF4444", "#F97316", "#EAB308", "#22C55E", "#06B6D4",
  "#3B82F6", "#8B5CF6", "#EC4899", "#14B8A6", "#F59E0B",
  "#84CC16", "#6366F1", "#D946EF", "#0EA5E9", "#10B981",
];

export const TAMIL_GROUPS: TamilGroup[] = [
  {
    group: "உயிரெழுத்து (Vowels)",
    icon: "ஐ",
    chars: [
      {
        char: "அ",
        label: "TA",
        name: "அ (a)",
        variants: [
          { label: "TA", description: "Standard form", period: "Modern" },
          { label: "TA_v1", description: "Early Chola (7–9th c.)", period: "Chola" },
          { label: "TA_v2", description: "Late Chola curved", period: "Chola-Vijayanagara" },
          { label: "TA_v3", description: "Vatteluttu-influenced", period: "Transitional" },
        ],
      },
      {
        char: "ஆ",
        label: "TAA",
        name: "ஆ (ā)",
        variants: [
          { label: "TAA", description: "Standard form" },
          { label: "TAA_v1", description: "Extended tail variant" },
          { label: "TAA_v2", description: "Compact palm-leaf form" },
        ],
      },
      {
        char: "இ",
        label: "TI",
        name: "இ (i)",
        variants: [
          { label: "TI", description: "Standard modern form", period: "Modern" },
          { label: "TI_variant_2", description: "Rounded top, open base", period: "Chola" },
          { label: "TI_variant_3", description: "Angular top, closed loop", period: "Pallava" },
          { label: "TI_variant_4", description: "Two-stroke open form", period: "Early Medieval" },
          { label: "TI_variant_5", description: "Grantha-influenced", period: "Medieval Grantha" },
        ],
      },
      {
        char: "ஈ",
        label: "TII",
        name: "ஈ (ī)",
        variants: [
          { label: "TII", description: "Standard form" },
          { label: "TII_v1", description: "Extended diacritic" },
          { label: "TII_v2", description: "Merged stroke" },
        ],
      },
      {
        char: "உ",
        label: "TU",
        name: "உ (u)",
        variants: [
          { label: "TU", description: "Standard form" },
          { label: "TU_v1", description: "Open hook" },
          { label: "TU_v2", description: "Deep-tail form" },
        ],
      },
      {
        char: "ஊ",
        label: "TUU",
        name: "ஊ (ū)",
        variants: [
          { label: "TUU", description: "Standard form" },
          { label: "TUU_v1", description: "Double-loop" },
        ],
      },
      {
        char: "எ",
        label: "TE",
        name: "எ (e)",
        variants: [
          { label: "TE", description: "Standard form" },
          { label: "TE_v1", description: "Short-loop" },
        ],
      },
      {
        char: "ஏ",
        label: "TEE",
        name: "ஏ (ē)",
        variants: [
          { label: "TEE", description: "Standard form" },
          { label: "TEE_v1", description: "Extended head" },
        ],
      },
      {
        char: "ஐ",
        label: "TAI",
        name: "ஐ (ai)",
        variants: [
          { label: "TAI", description: "Standard form" },
          { label: "TAI_v1", description: "Compressed form" },
        ],
      },
      {
        char: "ஒ",
        label: "TO",
        name: "ஒ (o)",
        variants: [
          { label: "TO", description: "Standard form" },
          { label: "TO_v1", description: "Open circle" },
        ],
      },
      {
        char: "ஓ",
        label: "TOO",
        name: "ஓ (ō)",
        variants: [
          { label: "TOO", description: "Standard form" },
          { label: "TOO_v1", description: "Tall loop" },
        ],
      },
      {
        char: "ஔ",
        label: "TAU",
        name: "ஔ (au)",
        variants: [
          { label: "TAU", description: "Standard form" },
          { label: "TAU_v1", description: "Compact" },
        ],
      },
    ],
  },
  {
    group: "மெய்யெழுத்து (Consonants)",
    icon: "க",
    chars: [
      {
        char: "க",
        label: "TKA",
        name: "க (ka)",
        variants: [
          { label: "TKA", description: "Standard form" },
          { label: "TKA_v1", description: "Early Pallava" },
          { label: "TKA_v2", description: "Chola angular" },
          { label: "TKA_v3", description: "Vijayanagara rounded" },
        ],
      },
      {
        char: "ங",
        label: "TNGA",
        name: "ங (ṅa)",
        variants: [
          { label: "TNGA", description: "Standard form" },
          { label: "TNGA_v1", description: "Open-tail" },
        ],
      },
      {
        char: "ச",
        label: "TCA",
        name: "ச (ca)",
        variants: [
          { label: "TCA", description: "Standard form" },
          { label: "TCA_v1", description: "Archaic curved" },
          { label: "TCA_v2", description: "Open-top" },
        ],
      },
      {
        char: "ஞ",
        label: "TNJA",
        name: "ஞ (ña)",
        variants: [
          { label: "TNJA", description: "Standard form" },
          { label: "TNJA_v1", description: "Extended form" },
        ],
      },
      {
        char: "ட",
        label: "TTA",
        name: "ட (ṭa)",
        variants: [
          { label: "TTA", description: "Standard form" },
          { label: "TTA_v1", description: "Open-head" },
        ],
      },
      {
        char: "ண",
        label: "TNNA",
        name: "ண (ṇa)",
        variants: [
          { label: "TNNA", description: "Standard form" },
          { label: "TNNA_v1", description: "Archaic form" },
        ],
      },
      {
        char: "த",
        label: "TTA2",
        name: "த (ta)",
        variants: [
          { label: "TTA2", description: "Standard form" },
          { label: "TTA2_v1", description: "Rounded form" },
        ],
      },
      {
        char: "ந",
        label: "TNA",
        name: "ந (na)",
        variants: [
          { label: "TNA", description: "Standard form" },
          { label: "TNA_v1", description: "Looped form" },
        ],
      },
      {
        char: "ப",
        label: "TPA",
        name: "ப (pa)",
        variants: [
          { label: "TPA", description: "Standard form" },
          { label: "TPA_v1", description: "Open-bowl" },
        ],
      },
      {
        char: "ம",
        label: "TMA",
        name: "ம (ma)",
        variants: [
          { label: "TMA", description: "Standard form" },
          { label: "TMA_v1", description: "Closed-loop" },
        ],
      },
      {
        char: "ய",
        label: "TYA",
        name: "ய (ya)",
        variants: [
          { label: "TYA", description: "Standard form" },
          { label: "TYA_v1", description: "Archaic swept" },
        ],
      },
      {
        char: "ர",
        label: "TRA",
        name: "ர (ra)",
        variants: [
          { label: "TRA", description: "Standard form" },
          { label: "TRA_v1", description: "Looped variant" },
        ],
      },
      {
        char: "ல",
        label: "TLA",
        name: "ல (la)",
        variants: [
          { label: "TLA", description: "Standard form" },
          { label: "TLA_v1", description: "Tall form" },
        ],
      },
      {
        char: "வ",
        label: "TVA",
        name: "வ (va)",
        variants: [
          { label: "TVA", description: "Standard form" },
          { label: "TVA_v1", description: "Open-top" },
        ],
      },
      {
        char: "ழ",
        label: "TZHA",
        name: "ழ (ḻa)",
        variants: [
          { label: "TZHA", description: "Standard form" },
          { label: "TZHA_v1", description: "Deep-tail" },
        ],
      },
      {
        char: "ள",
        label: "TLLA",
        name: "ள (ḷa)",
        variants: [
          { label: "TLLA", description: "Standard form" },
          { label: "TLLA_v1", description: "Extended form" },
        ],
      },
      {
        char: "ற",
        label: "TRRA",
        name: "ற (ṟa)",
        variants: [
          { label: "TRRA", description: "Standard form" },
          { label: "TRRA_v1", description: "Open-loop" },
        ],
      },
      {
        char: "ன",
        label: "TNNA2",
        name: "ன (ṉa)",
        variants: [
          { label: "TNNA2", description: "Standard form" },
          { label: "TNNA2_v1", description: "Compressed" },
        ],
      },
    ],
  },
  {
    group: "கிரந்த எழுத்து (Grantha)",
    icon: "ஜ",
    chars: [
      {
        char: "ஜ",
        label: "TJA",
        name: "ஜ (ja)",
        variants: [
          { label: "TJA", description: "Standard Grantha" },
          { label: "TJA_v1", description: "Simplified form" },
        ],
      },
      {
        char: "ஷ",
        label: "TSHA",
        name: "ஷ (ṣa)",
        variants: [
          { label: "TSHA", description: "Standard form" },
          { label: "TSHA_v1", description: "Archaic" },
        ],
      },
      {
        char: "ஸ",
        label: "TSA",
        name: "ஸ (sa)",
        variants: [
          { label: "TSA", description: "Standard form" },
          { label: "TSA_v1", description: "Grantha script" },
        ],
      },
      {
        char: "ஹ",
        label: "THA",
        name: "ஹ (ha)",
        variants: [
          { label: "THA", description: "Standard form" },
          { label: "THA_v1", description: "Grantha form" },
        ],
      },
      {
        char: "ஶ",
        label: "TSHA2",
        name: "ஶ (śa)",
        variants: [
          { label: "TSHA2", description: "Standard form" },
          { label: "TSHA2_v1", description: "Old form" },
        ],
      },
    ],
  },
  {
    group: "சிறப்பு (Special / Aytam)",
    icon: "ஃ",
    chars: [
      {
        char: "ஃ",
        label: "TAKH",
        name: "ஃ (aytam)",
        variants: [
          { label: "TAKH", description: "Standard aytam" },
          { label: "TAKH_v1", description: "Large dot form" },
          { label: "TAKH_v2", description: "Three-dot curved" },
        ],
      },
      {
        char: "்",
        label: "TPULLI",
        name: "் (puḷḷi / virāma)",
        variants: [
          { label: "TPULLI", description: "Standard dot" },
          { label: "TPULLI_v1", description: "Superscript line" },
        ],
      },
      {
        char: "ா",
        label: "Thunai_Kal",
        name: "ா (thunai kal)",
        variants: [
          { label: "TDIAC_AA", description: "Standard form" },
          { label: "TDIAC_AA_v1", description: "Short tail" },
        ],
      },
      {
        char: "ி",
        label: "kuril_suli",
        name: "ி (kuril suli)",
        variants: [
          { label: "kuril_suli", description: "Standard form" },
          { label: "kuril_suli_v1", description: "Curved form" },
        ],
      },
      {
        char: "ீ",
        label: "Nedil_suli",
        name: "ீ (nedil suli)",
        variants: [
          { label: "Nedil_suli", description: "Standard form" },
          { label: "Nedil_suli_v1", description: "Extended" },
        ],
      },
      {
        char: " ே",
        label: "Nedil_Kombu",
        name: " ே(nedil kombu)",
        variants: [
          { label: "Nedil_Kombu", description: "Standard form" },
          { label: "Nedil_Kombu_v1", description: "Joint-Extended" },
        ],
      },
      {
        char: " ெ",
        label: "kuril_Kombu_v2",
        name: " ெ (kuril kombu)",
        variants: [
          { label: "kuril_Kombu_v2", description: "Standard form" },
          { label: "kuril_Kombu_v2_v1", description: "Joint" },
        ],
      },
    ],
  },
];

export const ALL_LABELS: string[] = TAMIL_GROUPS.flatMap((g) =>
  g.chars.flatMap((c) => [c.label, ...c.variants.map((v) => v.label)])
);

export interface LabelInfo {
  char: string;
  charName: string;
  label: string;
  variantDescription: string;
  period: string;
  group: string;
  groupIcon: string;
}

// registry for custom characters created at runtime
const customCharMap: Map<string, TamilChar> = new Map();

export function registerCustomChar(char: TamilChar) {
  customCharMap.set(char.label, char);
}

export function getCustomChar(label: string): TamilChar | undefined {
  return customCharMap.get(label);
}

export function clearCustomChars() {
  customCharMap.clear();
}

/** Given a label string, return all metadata about it from the Tamil character table */
export function getLabelInfo(label: string): LabelInfo | null {
  // first check dynamically registered custom characters
  if (customCharMap.has(label)) {
    const custom = customCharMap.get(label)!;
    return {
      char: custom.char,
      charName: custom.name,
      label: custom.label,
      variantDescription: "Custom glyph",
      period: "",
      group: "Custom Glyphs",
      groupIcon: "📁",
    };
  }

  // Handle legacy folder labels (no metadata)
  if (label.startsWith("FOLDER_")) {
    const folderName = label.replace("FOLDER_", "").replace(/_/g, " ");
    return {
      char: "📁",
      charName: folderName,
      label: label,
      variantDescription: "Custom glyph",
      period: "",
      group: "Custom Glyphs",
      groupIcon: "📁",
    };
  }

  for (const group of TAMIL_GROUPS) {
    for (const char of group.chars) {
      // Check main label
      if (char.label === label) {
        return {
          char: char.char,
          charName: char.name,
          label: char.label,
          variantDescription: char.variants[0]?.description ?? "Standard form",
          period: char.variants[0]?.period ?? "",
          group: group.group,
          groupIcon: group.icon,
        };
      }
      // Check variant labels
      for (const variant of char.variants) {
        if (variant.label === label) {
          return {
            char: char.char,
            charName: char.name,
            label: variant.label,
            variantDescription: variant.description,
            period: variant.period ?? "",
            group: group.group,
            groupIcon: group.icon,
          };
        }
      }
    }
  }
  return null;
}
