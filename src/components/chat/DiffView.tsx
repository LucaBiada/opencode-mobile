import { useMemo } from "react"
import { View, Text, StyleSheet, Platform } from "react-native"
import { useTheme, type Theme } from "../../theme"
import { wideTextSelection } from "../../lib/scroll-config"
import { computeDiff } from "./diff-compute"

const mono = Platform.OS === "ios" ? "Menlo" : "monospace"

interface Props {
  before: string
  after: string
  isDark: boolean
}

function useThemedStyles() {
  const colors = useTheme()
  return useMemo(() => createStyles(colors), [colors])
}

export function DiffView({ before, after, isDark }: Props) {
  const s = useThemedStyles()
  const colors = useTheme()
  const lines = computeDiff(before, after)
  const sel = wideTextSelection(Platform.OS)

  if (lines.length === 0) return null

  return (
    <View style={[s.container, isDark && s.containerDark]} testID="diff-view">
      {lines.map((line, idx) => (
        <View
          key={idx}
          style={[
            s.line,
            line.type === "add" && (isDark ? s.addDark : s.add),
            line.type === "remove" && (isDark ? s.removeDark : s.remove),
          ]}
        >
          <Text style={[s.prefix, isDark && s.prefixDark]}>
            {line.type === "add" ? "+" : line.type === "remove" ? "-" : " "}
          </Text>
          {/* s.text is flex:1 with no numberOfLines, so a long diff line folds
              inside its own row: the +/- gutter stays aligned with the line it
              belongs to, and nothing is truncated (issue #21). Wrapping is
              rendering only — the diff text itself is untouched. */}
          <Text
            style={[
              s.text,
              isDark && s.textDark,
              line.type === "add" && s.addText,
              line.type === "remove" && s.removeText,
            ]}
            selectable={sel.selectable}
          >
            {line.text.length > 0 ? line.text : " "}
          </Text>
        </View>
      ))}
    </View>
  )
}

function createStyles(colors: Theme) {
  return StyleSheet.create({
  container: {
    borderRadius: 6,
    overflow: "hidden",
    backgroundColor: colors.panelAlt,
    marginTop: 6,
  },
  containerDark: { backgroundColor: colors.panelAlt },

  line: {
    flexDirection: "row",
    paddingHorizontal: 8,
    paddingVertical: 1,
  },
  add: { backgroundColor: colors.successSoft },
  addDark: { backgroundColor: colors.successSoft },
  remove: { backgroundColor: colors.dangerSoft },
  removeDark: { backgroundColor: colors.dangerSoft },

  prefix: {
    width: 16,
    fontSize: 12,
    fontFamily: mono,
    color: colors.muted,
    lineHeight: 20,
  },
  prefixDark: { color: colors.muted },

  text: {
    // flex:1 is what makes the fold happen inside the row instead of pushing the
    // row wider than the screen.
    flex: 1,
    fontSize: 12,
    fontFamily: mono,
    color: colors.text,
    lineHeight: 20,
  },
  textDark: { color: colors.text },
  addText: { color: colors.success },
  removeText: { color: colors.danger },
  })
}
