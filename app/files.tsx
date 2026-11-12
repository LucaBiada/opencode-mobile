import { useCallback, useEffect, useMemo, useState } from "react"
import { ActivityIndicator, FlatList, StyleSheet, Text, TouchableOpacity, View } from "react-native"
import { Ionicons } from "@expo/vector-icons"
import { router, Stack, useLocalSearchParams } from "expo-router"
import { useTranslation } from "react-i18next"
import * as Sharing from "expo-sharing"

import { walk, resolveFile, type WalkEntry } from "../src/engines/phone/workspace"
import { useTheme, type Theme } from "../src/theme"

function iconFor(path: string): keyof typeof Ionicons.glyphMap {
  const ext = path.split(".").pop()?.toLowerCase() ?? ""
  if (["html", "htm"].includes(ext)) return "logo-html5"
  if (["png", "jpg", "jpeg", "gif", "webp", "svg"].includes(ext)) return "image-outline"
  if (["md", "markdown", "txt"].includes(ext)) return "document-text-outline"
  if (["json", "js", "ts", "tsx", "jsx", "css", "py", "sh"].includes(ext)) return "code-slash-outline"
  return "document-outline"
}

function formatSize(size: number | null): string {
  if (size == null) return ""
  if (size < 1024) return `${size} B`
  if (size < 1024 * 1024) return `${(size / 1024).toFixed(1)} KB`
  return `${(size / (1024 * 1024)).toFixed(1)} MB`
}

export default function FilesScreen() {
  const { session } = useLocalSearchParams<{ session: string }>()
  const s = useStyles()
  const colors = useTheme()
  const { t } = useTranslation()
  const [entries, setEntries] = useState<WalkEntry[] | null>(null)

  const files = useMemo(() => (entries ?? []).filter((entry) => !entry.isDirectory), [entries])

  useEffect(() => {
    if (!session) {
      setEntries([])
      return
    }
    try {
      setEntries(walk(session))
    } catch {
      setEntries([])
    }
  }, [session])

  const share = useCallback(async (path: string) => {
    const file = resolveFile(session, path)
    if (await Sharing.isAvailableAsync()) {
      await Sharing.shareAsync(file.uri, { dialogTitle: path })
    }
  }, [session])

  return (
    <View style={s.container}>
      <Stack.Screen
        options={{
          title: t("files.title"),
          headerStyle: { backgroundColor: colors.bg },
          headerShadowVisible: false,
          headerTintColor: colors.text,
        }}
      />
      {entries === null ? (
        <View style={s.center}>
          <ActivityIndicator color={colors.text} />
        </View>
      ) : files.length === 0 ? (
        <View style={s.center}>
          <Ionicons name="folder-open-outline" size={48} color={colors.muted} />
          <Text style={s.empty}>{t("files.empty")}</Text>
        </View>
      ) : (
        <FlatList
          data={files}
          keyExtractor={(item) => item.path}
          contentContainerStyle={s.list}
          renderItem={({ item }) => (
            <TouchableOpacity
              style={s.row}
              onPress={() => router.push({ pathname: "/preview", params: { session, path: item.path } })}
              testID={`file-${item.path}`}
            >
              <Ionicons name={iconFor(item.path)} size={20} color={colors.accent} />
              <View style={s.rowBody}>
                <Text style={s.path} numberOfLines={1}>
                  {item.path}
                </Text>
                <Text style={s.size}>{formatSize(item.size)}</Text>
              </View>
              <TouchableOpacity hitSlop={10} onPress={() => void share(item.path)} testID={`share-${item.path}`}>
                <Ionicons name="share-outline" size={18} color={colors.muted} />
              </TouchableOpacity>
            </TouchableOpacity>
          )}
        />
      )}
    </View>
  )
}

function useStyles() {
  const colors = useTheme()
  return useMemo(() => createStyles(colors), [colors])
}

function createStyles(colors: Theme) {
  return StyleSheet.create({
    container: { flex: 1, backgroundColor: colors.bg },
    center: { flex: 1, alignItems: "center", justifyContent: "center", gap: 12, padding: 24 },
    empty: { color: colors.muted, fontSize: 15, textAlign: "center" },
    list: { paddingVertical: 8 },
    row: {
      flexDirection: "row",
      alignItems: "center",
      gap: 12,
      paddingHorizontal: 16,
      paddingVertical: 12,
      borderBottomWidth: StyleSheet.hairlineWidth,
      borderBottomColor: colors.border,
    },
    rowBody: { flex: 1 },
    path: { color: colors.text, fontSize: 15, fontWeight: "500" },
    size: { color: colors.muted, fontSize: 12, marginTop: 2 },
  })
}
