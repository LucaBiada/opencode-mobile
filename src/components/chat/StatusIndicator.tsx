import { useMemo } from "react"
import { View, Text, StyleSheet, ActivityIndicator } from "react-native"
import { useTheme, type Theme } from "../../theme"
import { useTranslation } from "react-i18next"
import { useEvents } from "../../stores/events"
import { useSessions } from "../../stores/sessions"

interface Props {
  sessionID: string
  isDark: boolean
}

function useThemedStyles() {
  const colors = useTheme()
  return useMemo(() => createStyles(colors), [colors])
}

export function StatusIndicator({ sessionID, isDark }: Props) {
  const s = useThemedStyles()
  const colors = useTheme()
  const { t } = useTranslation()
  const status = useEvents((s) => s.sessionStatus[sessionID])
  const text = useEvents((s) => s.statusText[sessionID])
  const optimistic = useSessions((s) => s.sending[sessionID])

  // SSE status is the source of truth. The optimistic `sending` flag only
  // covers the gap between the user tapping send and SSE confirming busy.
  // Once SSE reports idle, the indicator hides regardless of the optimistic flag.
  const sseBusy = status && status.type !== "idle"
  const busy = sseBusy || (optimistic && !status)
  if (!busy) return null

  const label =
    status?.type === "retry" ? t("chat.statusIndicator.retrying", { attempt: status.attempt }) : text || t("chat.statusIndicator.working")

  return (
    <View style={[s.bar, isDark && s.barDark]}>
      <ActivityIndicator size="small" color={colors.accent} />
      <Text style={[s.text, isDark && s.textDark]}>{label}</Text>
    </View>
  )
}

function createStyles(colors: Theme) {
  return StyleSheet.create({
  bar: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
    paddingHorizontal: 16,
    paddingVertical: 8,
    backgroundColor: colors.accentSoft,
    borderTopWidth: 1,
    borderTopColor: colors.border,
  },
  barDark: { backgroundColor: colors.accentSoft, borderTopColor: colors.border },
  text: { fontSize: 13, color: colors.accent, fontWeight: "500" },
  textDark: { color: colors.accent },
  })
}
