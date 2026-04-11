import type { DiagramTheme } from "./types"

export const LEGAL_CLASSIC: DiagramTheme = {
  name: "classic",
  background: "#FEFCF3",
  foreground: "#1B2838",
  fontFamily: '"Iowan Old Style", "Palatino Linotype", Palatino, Georgia, serif',
  monoFontFamily: '"JetBrains Mono", "Fira Code", "SF Mono", Consolas, monospace',
  fontSize: 15,
  labelFontSize: 10,
  borderRadius: 4,
  connectorColor: "#90A4AE",
  colors: {
    signal: {
      fill: "#F0E6D3",
      stroke: "#B8860B",
      text: "#7A5C00",
      glow: "rgba(184, 134, 11, 0.2)",
    },
    identity: {
      fill: "#E8EAF6",
      stroke: "#283593",
      text: "#1A237E",
      glow: "rgba(40, 53, 147, 0.2)",
    },
    locator: {
      fill: "#E8F5E9",
      stroke: "#2E7D32",
      text: "#1B5E20",
      glow: "rgba(46, 125, 50, 0.2)",
    },
    reference: {
      fill: "#E0F2F1",
      stroke: "#00695C",
      text: "#004D40",
      glow: "rgba(0, 105, 92, 0.2)",
    },
    metadata: {
      fill: "#FFF3E0",
      stroke: "#E65100",
      text: "#BF360C",
      glow: "rgba(230, 81, 0, 0.2)",
    },
    context: {
      fill: "#F3E5F5",
      stroke: "#6A1B9A",
      text: "#4A148C",
      glow: "rgba(106, 27, 154, 0.2)",
    },
    marker: {
      fill: "#ECEFF1",
      stroke: "#546E7A",
      text: "#37474F",
      glow: "rgba(84, 110, 122, 0.2)",
    },
  },
}
