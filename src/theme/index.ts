import { useColorScheme } from "react-native"

// One palette for the whole app. Dark values are measured from the reference
// screenshots; light values are the same roles on a paper background.
export interface Theme {
  bg: string
  panel: string
  panelAlt: string
  border: string
  text: string
  textDim: string
  muted: string
  accent: string
  accentPressed: string
  success: string
  danger: string
  codeBg: string
  codeText: string
  userBubble: string
  overlay: string
  accentSoft: string
  successSoft: string
  dangerSoft: string
}

export const darkColors: Theme = {
  bg: "#141415",
  panel: "#202020",
  panelAlt: "#303030",
  border: "#3A3A3A",
  text: "#F2F2F3",
  textDim: "#D6D6DA",
  muted: "#B0B0B4",
  accent: "#8B5CF6",
  accentPressed: "#7C3AED",
  success: "#4ADE80",
  danger: "#F87171",
  codeBg: "#18212C",
  codeText: "#A8C7E8",
  userBubble: "#0D0D0E",
  overlay: "rgba(0,0,0,0.6)",
  accentSoft: "#2A2140",
  successSoft: "#14251A",
  dangerSoft: "#2A1414",
}

export const lightColors: Theme = {
  bg: "#F7F7F8",
  panel: "#FFFFFF",
  panelAlt: "#EFEFF1",
  border: "#DCDCDE",
  text: "#101012",
  textDim: "#3A3A3E",
  muted: "#6E6E75",
  accent: "#7C3AED",
  accentPressed: "#6D28D9",
  success: "#16A34A",
  danger: "#DC2626",
  codeBg: "#EEF2F7",
  codeText: "#2B5A80",
  userBubble: "#E8E8EB",
  overlay: "rgba(0,0,0,0.35)",
  accentSoft: "#EDE9FE",
  successSoft: "#ECFDF3",
  dangerSoft: "#FEF2F2",
}

export function useTheme(): Theme {
  return useColorScheme() === "light" ? lightColors : darkColors
}
