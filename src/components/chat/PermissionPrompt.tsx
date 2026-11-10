import { useMemo } from "react"
import { View, Text, TouchableOpacity, StyleSheet } from "react-native"
import { useTheme, type Theme } from "../../theme"
import { Ionicons } from "@expo/vector-icons"
import { useTranslation } from "react-i18next"

interface Props {
  permission: { id: string; permission: string; patterns: string[] }
  isDark: boolean
  onReply: (reply: "once" | "always" | "reject") => void
}

function useThemedStyles() {
  const colors = useTheme()
  return useMemo(() => createStyles(colors), [colors])
}

export function PermissionPrompt({ permission, onReply }: Props) {
  const s = useThemedStyles()
  const colors = useTheme()
  const { t } = useTranslation()
  return (
    <View style={s.card}>
      <View style={s.header}>
        <Ionicons name="shield-outline" size={18} color={colors.accent} />
        <Text style={s.title}>{t("chat.permissionPrompt.title")}</Text>
      </View>
      <Text style={s.type}>
        {permission.permission}: {permission.patterns.join(", ")}
      </Text>
      <View style={s.actions}>
        <TouchableOpacity style={[s.btn, s.deny]} onPress={() => onReply("reject")}>
          <Text style={s.denyText}>{t("chat.permissionPrompt.deny")}</Text>
        </TouchableOpacity>
        <TouchableOpacity style={[s.btn, s.always]} onPress={() => onReply("always")}>
          <Text style={s.alwaysText}>{t("chat.permissionPrompt.always")}</Text>
        </TouchableOpacity>
        <TouchableOpacity style={[s.btn, s.allow]} onPress={() => onReply("once")}>
          <Text style={s.allowText}>{t("chat.permissionPrompt.allow")}</Text>
        </TouchableOpacity>
      </View>
    </View>
  )
}

function createStyles(colors: Theme) {
  return StyleSheet.create({
    card: {
      margin: 12,
      padding: 16,
      backgroundColor: colors.panel,
      borderRadius: 18,
      borderWidth: 1,
      borderColor: colors.border,
    },
    header: { flexDirection: "row", alignItems: "center", gap: 8, marginBottom: 8 },
    title: { fontSize: 15, fontWeight: "600", color: colors.text },
    type: { fontSize: 13, color: colors.muted, marginBottom: 12 },
    actions: { flexDirection: "row", gap: 8 },
    btn: { flex: 1, paddingVertical: 10, borderRadius: 11, alignItems: "center" },
    deny: { backgroundColor: colors.dangerSoft },
    denyText: { color: colors.danger, fontWeight: "600", fontSize: 14 },
    always: { backgroundColor: colors.panelAlt },
    alwaysText: { color: colors.textDim, fontWeight: "600", fontSize: 14 },
    allow: { backgroundColor: colors.accent },
    allowText: { color: colors.onAccent, fontWeight: "600", fontSize: 14 },
  })
}
