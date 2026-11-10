import { useState } from "react"
import { useMemo } from "react"
import { useTheme, type Theme } from "../../theme"
import { View, Text, TouchableOpacity, StyleSheet, useColorScheme, Platform } from "react-native"
import * as Clipboard from "expo-clipboard"
import { wideTextSelection } from "../../lib/scroll-config"

interface Props {
  code: string
  language?: string
}

function useThemedStyles() {
  const colors = useTheme()
  return useMemo(() => createStyles(colors), [colors])
}

export function CodeBlock({ code, language }: Props) {
  const styles = useThemedStyles()
  const isDark = useColorScheme() === "dark"
  const [copied, setCopied] = useState(false)
  const sel = wideTextSelection(Platform.OS)

  // Cosmetic wrapping: one Text per logical line, so indentation survives and a
  // long line folds inside the block instead of needing sideways scrolling.
  // The clipboard gets `code` — the raw string from the server — so what you
  // paste is byte-identical to what was sent, line breaks and all. Wrapping only
  // exists in the rendering. See ../../lib/scroll-config for why these blocks no
  // longer scroll horizontally.
  const lines = code.split("\n")

  const copy = async () => {
    try {
      await Clipboard.setStringAsync(code)
      setCopied(true)
      setTimeout(() => setCopied(false), 2000)
    } catch {}
  }

  return (
    <View style={[styles.container, isDark && styles.containerDark]}>
      <View style={[styles.header, isDark && styles.headerDark]}>
        <Text style={[styles.language, isDark && styles.languageDark]}>{language || "code"}</Text>
        <TouchableOpacity onPress={copy} hitSlop={8}>
          <Text style={[styles.copyBtn, isDark && styles.copyBtnDark]}>{copied ? "Copied!" : "Copy"}</Text>
        </TouchableOpacity>
      </View>
      <View style={styles.codeBody} testID="code-block-body">
        {lines.map((line, idx) => (
          // An empty Text collapses to zero height, which would eat blank lines
          // and make pasted-vs-displayed line counts disagree.
          <Text key={idx} style={[styles.code, isDark && styles.codeDark]} selectable={sel.selectable}>
            {line.length > 0 ? line : " "}
          </Text>
        ))}
      </View>
    </View>
  )
}

function createStyles(colors: Theme) {
  return StyleSheet.create({
  container: {
    backgroundColor: colors.panelAlt,
    borderRadius: 8,
    marginVertical: 8,
    overflow: "hidden",
  },
  containerDark: {
    backgroundColor: colors.panelAlt,
  },
  header: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    paddingHorizontal: 12,
    paddingVertical: 6,
    backgroundColor: colors.panelAlt,
  },
  headerDark: {
    backgroundColor: colors.panel,
  },
  language: {
    fontSize: 11,
    fontWeight: "600",
    color: colors.muted,
    textTransform: "uppercase",
  },
  languageDark: {
    color: colors.muted,
  },
  copyBtn: {
    fontSize: 11,
    color: colors.accent,
    fontWeight: "600",
  },
  copyBtnDark: {
    color: colors.accent,
  },
  codeBody: {
    padding: 12,
  },
  code: {
    fontFamily: Platform.OS === "ios" ? "Menlo" : "monospace",
    fontSize: 13,
    lineHeight: 20,
    color: colors.text,
  },
  codeDark: {
    color: colors.text,
  },
  })
}
