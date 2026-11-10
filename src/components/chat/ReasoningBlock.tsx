import { useState } from "react"
import { useMemo } from "react"
import { useTheme, type Theme } from "../../theme"
import { View, Text, TouchableOpacity, StyleSheet } from "react-native"
import { Ionicons } from "@expo/vector-icons"
import { useTranslation } from "react-i18next"

interface Props {
  text: string
  isDark: boolean
}

function useThemedStyles() {
  const colors = useTheme()
  return useMemo(() => createStyles(colors), [colors])
}

export function ReasoningBlock({ text }: Props) {
  const s = useThemedStyles()
  const colors = useTheme()
  const { t } = useTranslation()
  const [expanded, setExpanded] = useState(false)

  return (
    <TouchableOpacity style={s.block} onPress={() => setExpanded(!expanded)} activeOpacity={0.7}>
      <View style={s.header}>
        <Ionicons name="bulb-outline" size={14} color={colors.accent} />
        <Text style={s.label}>{t("chat.reasoningBlock.label")}</Text>
        <Ionicons name={expanded ? "chevron-up" : "chevron-down"} size={14} color={colors.muted} />
      </View>
      {expanded && (
        <Text style={s.text} selectable>
          {text}
        </Text>
      )}
    </TouchableOpacity>
  )
}

function createStyles(colors: Theme) {
  return StyleSheet.create({
    block: {
      backgroundColor: colors.panel,
      borderRadius: 12,
      padding: 12,
      marginBottom: 8,
      borderWidth: 1,
      borderColor: colors.border,
    },
    header: { flexDirection: "row", alignItems: "center", gap: 6 },
    label: { fontSize: 12, fontWeight: "600", color: colors.textDim, flex: 1 },
    text: { fontSize: 13, lineHeight: 20, color: colors.muted, marginTop: 8 },
  })
}
