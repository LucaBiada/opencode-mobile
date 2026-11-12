import { useEffect, useMemo, useState } from "react"
import { ActivityIndicator, Image, ScrollView, StyleSheet, Text, TouchableOpacity, View } from "react-native"
import { Ionicons } from "@expo/vector-icons"
import { Stack, useLocalSearchParams } from "expo-router"
import { useTranslation } from "react-i18next"
import * as Sharing from "expo-sharing"
import { WebView } from "react-native-webview"

import { Markdown } from "../src/components/markdown"
import { readText, resolveFile } from "../src/engines/phone/workspace"
import { useTheme, type Theme } from "../src/theme"

const TEXT = /\.(html?|md|markdown|txt|json|jsx?|tsx?|css|py|sh|ya?ml|toml|ini|xml|sql|rs|go|rb|c|h|cpp|java|kt)$/i
const IMAGE = /\.(png|jpe?g|gif|webp|bmp)$/i

export default function PreviewScreen() {
  const { session, path } = useLocalSearchParams<{ session: string; path: string }>()
  const s = useStyles()
  const colors = useTheme()
  const { t } = useTranslation()
  const [body, setBody] = useState<string | null>(null)
  const [error, setError] = useState<string | null>(null)

  const isHtml = /\.html?$/i.test(path ?? "")
  const isMarkdown = /\.(md|markdown)$/i.test(path ?? "")
  const isImage = IMAGE.test(path ?? "")
  const file = useMemo(() => (session && path ? resolveFile(session, path) : null), [session, path])

  useEffect(() => {
    if (!session || !path || !file) return
    if (isImage) return
    if (!TEXT.test(path)) return
    readText(session, path)
      .then(setBody)
      .catch((err) => setError(err instanceof Error ? err.message : String(err)))
  }, [file, isImage, path, session])

  const share = async () => {
    if (!file) return
    if (await Sharing.isAvailableAsync()) {
      await Sharing.shareAsync(file.uri, { dialogTitle: path })
    }
  }

  return (
    <View style={s.container}>
      <Stack.Screen
        options={{
          title: path?.split("/").pop() ?? t("files.previewTitle"),
          headerStyle: { backgroundColor: colors.bg },
          headerShadowVisible: false,
          headerTintColor: colors.text,
          headerRight: () => (
            <TouchableOpacity onPress={() => void share()} hitSlop={10} testID="preview-share">
              <Ionicons name="share-outline" size={20} color={colors.text} />
            </TouchableOpacity>
          ),
        }}
      />

      {error ? (
        <View style={s.center}>
          <Ionicons name="alert-circle-outline" size={44} color={colors.danger} />
          <Text style={s.message}>{error}</Text>
        </View>
      ) : isImage ? (
        <ScrollView contentContainerStyle={s.imageWrap} maximumZoomScale={4}>
          <Image source={{ uri: file?.uri }} style={s.image} resizeMode="contain" />
        </ScrollView>
      ) : !TEXT.test(path ?? "") ? (
        <View style={s.center}>
          <Ionicons name="document-outline" size={44} color={colors.muted} />
          <Text style={s.message}>{t("files.unsupported")}</Text>
          <TouchableOpacity style={s.button} onPress={() => void share()}>
            <Ionicons name="share-outline" size={16} color={colors.onAccent} />
            <Text style={s.buttonText}>{t("files.share")}</Text>
          </TouchableOpacity>
        </View>
      ) : body === null ? (
        <View style={s.center}>
          <ActivityIndicator color={colors.text} />
        </View>
      ) : isHtml ? (
        <WebView
          originWhitelist={["*"]}
          source={{ html: body, baseUrl: file ? file.uri.slice(0, file.uri.lastIndexOf("/") + 1) : "" }}
          allowFileAccess
          allowUniversalAccessFromFileURLs
          javaScriptEnabled
          style={s.web}
        />
      ) : isMarkdown ? (
        <ScrollView contentContainerStyle={s.textWrap}>
          <Markdown>{body}</Markdown>
        </ScrollView>
      ) : (
        <ScrollView contentContainerStyle={s.textWrap}>
          <Text style={s.code} selectable>
            {body}
          </Text>
        </ScrollView>
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
    message: { color: colors.muted, fontSize: 15, textAlign: "center", lineHeight: 21 },
    imageWrap: { padding: 16, alignItems: "center" },
    image: { width: "100%", height: 460 },
    web: { flex: 1, backgroundColor: colors.bg },
    textWrap: { padding: 16, paddingBottom: 48 },
    code: {
      color: colors.text,
      fontSize: 13,
      lineHeight: 20,
      fontFamily: "monospace",
    },
    button: {
      flexDirection: "row",
      alignItems: "center",
      gap: 8,
      backgroundColor: colors.accent,
      paddingHorizontal: 16,
      paddingVertical: 10,
      borderRadius: 11,
      marginTop: 4,
    },
    buttonText: { color: colors.onAccent, fontWeight: "600", fontSize: 14 },
  })
}
