import { useMemo } from "react"
import { useTheme, type Theme } from "../../theme"
import { View, Text, TouchableOpacity, ScrollView, StyleSheet, Keyboard, Platform } from "react-native"
import { Ionicons } from "@expo/vector-icons"
import { useTranslation } from "react-i18next"

export interface SlashCommand {
  trigger: string
  title: string
  description?: string
  icon: string
  type: "builtin" | "custom"
}

interface Props {
  query: string
  commands: SlashCommand[]
  isDark: boolean
  onSelect: (cmd: SlashCommand) => void
}

function useThemedStyles() {
  const colors = useTheme()
  return useMemo(() => createStyles(colors), [colors])
}

export function SlashPopover({ query, commands, isDark, onSelect }: Props) {
  const s = useThemedStyles()
  const colors = useTheme()
  const { t } = useTranslation()
  const filtered = useMemo(() => {
    const q = query.toLowerCase()
    return commands.filter((c) => c.trigger.toLowerCase().startsWith(q) || c.title.toLowerCase().includes(q))
  }, [query, commands])

  if (filtered.length === 0) return null

  return (
    <View style={[s.popover, isDark && s.popoverDark]}>
      <ScrollView keyboardShouldPersistTaps="always" style={s.scroll}>
        {filtered.map((cmd) => (
          <TouchableOpacity key={cmd.trigger} style={[s.item, isDark && s.itemDark]} onPress={() => onSelect(cmd)}>
            <Ionicons
              name={cmd.icon as any}
              size={18}
              color={cmd.type === "custom" ? colors.accent : colors.muted}
            />
            <View style={s.textCol}>
              <Text style={[s.trigger, isDark && s.textWhite]}>/{cmd.trigger}</Text>
              {cmd.description && (
                <Text style={[s.desc, isDark && s.metaDark]} numberOfLines={1}>
                  {cmd.description}
                </Text>
              )}
            </View>
            {cmd.type === "custom" && (
              <View style={[s.badge, isDark && s.badgeDark]}>
                <Text style={s.badgeText}>{t("chat.slashPopover.customBadge")}</Text>
              </View>
            )}
          </TouchableOpacity>
        ))}
      </ScrollView>
    </View>
  )
}

function createStyles(colors: Theme) {
  return StyleSheet.create({
  popover: {
    backgroundColor: colors.panel,
    borderTopWidth: 1,
    borderTopColor: colors.border,
    maxHeight: 220,
  },
  popoverDark: { backgroundColor: colors.panelAlt, borderTopColor: colors.border },
  scroll: { paddingVertical: 4 },
  item: {
    flexDirection: "row",
    alignItems: "center",
    gap: 10,
    paddingHorizontal: 16,
    paddingVertical: 10,
  },
  itemDark: {},
  textCol: { flex: 1 },
  trigger: { fontSize: 14, fontWeight: "600", color: colors.text },
  textWhite: { color: colors.onAccent },
  desc: { fontSize: 12, color: colors.muted, marginTop: 1 },
  metaDark: { color: colors.muted },
  badge: {
    backgroundColor: colors.accentSoft,
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 4,
  },
  badgeDark: { backgroundColor: colors.accentSoft },
  badgeText: { fontSize: 10, color: colors.accent, fontWeight: "600" },
  })
}
