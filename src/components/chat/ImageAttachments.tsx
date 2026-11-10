import { useMemo } from "react"
import { View, Text, Image, TouchableOpacity, StyleSheet, ScrollView } from "react-native"
import { useTheme, type Theme } from "../../theme"
import { Ionicons } from "@expo/vector-icons"

export interface Attachment {
  uri: string
  mime: string
  filename?: string
  width?: number
  height?: number
  base64?: string
}

interface Props {
  attachments: Attachment[]
  isDark: boolean
  onRemove: (index: number) => void
}

function useThemedStyles() {
  const colors = useTheme()
  return useMemo(() => createStyles(colors), [colors])
}

export function ImageAttachments({ attachments, isDark, onRemove }: Props) {
  const s = useThemedStyles()
  const colors = useTheme()
  if (attachments.length === 0) return null

  return (
    <View style={[s.container, isDark && s.containerDark]}>
      <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={s.scroll}>
        {attachments.map((att, idx) => (
          <View key={`${att.uri}-${idx}`} style={s.thumb}>
            <Image source={{ uri: att.uri }} style={s.image} resizeMode="cover" />
            <TouchableOpacity style={[s.remove, isDark && s.removeDark]} onPress={() => onRemove(idx)}>
              <Ionicons name="close" size={14} color={colors.onAccent} />
            </TouchableOpacity>
            {att.filename && (
              <Text style={[s.label, isDark && s.labelDark]} numberOfLines={1}>
                {att.filename}
              </Text>
            )}
          </View>
        ))}
      </ScrollView>
    </View>
  )
}

function createStyles(colors: Theme) {
  return StyleSheet.create({
  container: {
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderTopWidth: 1,
    borderTopColor: colors.border,
    backgroundColor: colors.panel,
  },
  containerDark: { backgroundColor: colors.bg, borderTopColor: colors.border },
  scroll: { gap: 8 },
  thumb: { position: "relative" },
  image: {
    width: 72,
    height: 72,
    borderRadius: 8,
    backgroundColor: colors.panelAlt,
  },
  remove: {
    position: "absolute",
    top: -6,
    right: -6,
    width: 22,
    height: 22,
    borderRadius: 11,
    backgroundColor: colors.bg,
    justifyContent: "center",
    alignItems: "center",
    borderWidth: 2,
    borderColor: colors.onAccent,
  },
  removeDark: { backgroundColor: colors.danger, borderColor: colors.bg },
  label: {
    fontSize: 10,
    color: colors.muted,
    marginTop: 2,
    maxWidth: 72,
    textAlign: "center",
  },
  labelDark: { color: colors.muted },
  })
}
