const COBALT = "#065ec6";
const AMBER = "#d28314";
const OLIVE = "#5c800f";
const TERRACOTTA = "#d0542d";
const TEAL = "#0e7490";
const VIOLET = "#7c3aed";
const ROSE = "#b21f57";
const FOREST = "#166534";

export const CHIP_PALETTE: readonly string[] = [
  COBALT,
  TERRACOTTA,
  OLIVE,
  AMBER,
  TEAL,
  VIOLET,
  ROSE,
  FOREST,
];

// Pin specific chip labels to a fixed palette entry so a recurring tag always
// reads the same colour. Anything not listed falls back to the stable hash
// below, so this map is optional.
const LABEL_COLOR: Record<string, string> = {
  Placeholder: COBALT,
};

export function chipColorFor(label: string | undefined): string | undefined {
  if (!label) return undefined;
  return LABEL_COLOR[label.trim()];
}

interface ChipColorInput {
  kicker?: string;
  kickerColor?: string;
}

export function resolveChipColors(
  items: readonly ChipColorInput[],
): (string | undefined)[] {
  const out: (string | undefined)[] = [];
  let prev: string | undefined;
  for (const item of items) {
    const preferred = item.kickerColor ?? chipColorFor(item.kicker);
    let chosen = preferred;
    if (chosen && chosen === prev) {
      chosen = CHIP_PALETTE.find((c) => c !== prev) ?? preferred;
    }
    out.push(chosen);
    prev = chosen;
  }
  return out;
}
