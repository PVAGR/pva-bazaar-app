export const PVA_COLORS = {
  pva: {
    sage: {
      DEFAULT: "#3a5a40",
      light: "#588157",
      dark: "#2c4231",
    },
    terracotta: {
      DEFAULT: "#a44a3f",
      light: "#c95b4d",
      dark: "#7d3830",
    },
    gold: {
      DEFAULT: "#d4af37",
    },
  },
} as const;

export type PvaColorName =
  | "sage"
  | "terracotta"
  | "gold";
