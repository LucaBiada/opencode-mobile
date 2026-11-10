import { memo, useMemo, useState } from "react"
import { Image, Platform, ScrollView, Share, StyleSheet, Text, TouchableOpacity, View, useColorScheme } from "react-native"
import { Ionicons } from "@expo/vector-icons"
import * as Clipboard from "expo-clipboard"

import { Markdown } from "../markdown"
import { ToolCallCard } from "./ToolCallCard"
import type { Message, Part } from "../../lib/sdk"
import { hasSelectableContent } from "../../lib/message-text"
import { useTheme, type Theme } from "../../theme"

function isImageMime(mime?: string): boolean {
  return !!mime && mime.startsWith("image/")
}

function plainText(parts: Part[]): string {
  return parts
    .filter((part) => part.type === "text" && part.text)
    .map((part) => part.text as string)
    .join("\n")
}

interface Props {
  message: Message
  parts: Part[]
  // Kept for callers that already compute it; colours come from the theme now.
  isDark?: boolean
  onSelectText?: (messageID: string) => void
  onEdit?: (messageID: string) => void
}

export const MessageBubble = memo(
  function MessageBubble({ message, parts, onSelectText, onEdit }: Props) {
    const colors = useTheme()
    const styles = useMemo(() => createStyles(colors), [colors])
    const scheme = useColorScheme()
    const isDark = scheme !== "light"
    const isUser = message.role === "user"

    const text = plainText(parts)
    const reasoning = parts
      .filter((part) => part.type === "reasoning" && part.text)
      .map((part) => part.text)
      .join("\n")
    const tools = parts.filter((part) => part.type === "tool")
    const images = parts.filter((part) => part.type === "file" && isImageMime(part.mime))

    return (
      <View style={isUser ? styles.userRow : styles.assistant} testID={`chat-bubble-${message.role}`}>
        {images.length > 0 ? (
          <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.imageRow}>
            {images.map((part) => (
              <View key={part.id} style={styles.imageWrap}>
                <Image source={{ uri: part.url }} style={styles.image} resizeMode="cover" />
                {part.filename ? (
                  <Text style={styles.imageLabel} numberOfLines={1}>
                    {part.filename}
                  </Text>
                ) : null}
              </View>
            ))}
          </ScrollView>
        ) : null}

        {reasoning && !isUser ? <Reasoning text={reasoning} colors={colors} /> : null}

        {text ? (
          isUser ? (
            <View style={styles.userBubble}>
              <Markdown tight>{text}</Markdown>
            </View>
          ) : (
            <Markdown>{text}</Markdown>
          )
        ) : null}

        {tools.map((tool) => (
          <ToolCallCard key={tool.id} tool={tool} isDark={isDark} />
        ))}

        {message.error?.message ? (
          <View style={styles.error}>
            <Text style={styles.errorText} selectable={Platform.OS === "ios"}>
              {message.error.message}
            </Text>
          </View>
        ) : null}

        {!isUser && (text || message.tokens) ? (
          <View style={styles.footer}>
            {text ? (
              <>
                <TouchableOpacity
                  hitSlop={10}
                  onPress={() => void Clipboard.setStringAsync(text)}
                  testID={`message-copy-${message.id}`}
                >
                  <Ionicons name="copy-outline" size={19} color={colors.muted} />
                </TouchableOpacity>
                <TouchableOpacity hitSlop={10} onPress={() => void Share.share({ message: text })}>
                  <Ionicons name="share-outline" size={19} color={colors.muted} />
                </TouchableOpacity>
              </>
            ) : null}
            {onSelectText && hasSelectableContent(parts) && (
              <TouchableOpacity
                hitSlop={10}
                onPress={() => onSelectText(message.id)}
                testID={`message-select-text-${message.id}`}
              >
                <Ionicons name="document-text-outline" size={18} color={colors.muted} />
              </TouchableOpacity>
            )}
            {message.tokens ? (
              <Text style={styles.tokens}>
                {message.tokens.input + message.tokens.output} tokens
                {message.cost ? ` · $${message.cost.toFixed(4)}` : ""}
              </Text>
            ) : null}
          </View>
        ) : null}

        {isUser && onEdit && !isUserBlocked(parts) && (
          <View style={styles.userActions}>
            <TouchableOpacity hitSlop={10} onPress={() => onEdit(message.id)} testID={`message-edit-${message.id}`}>
              <Ionicons name="pencil-outline" size={17} color={colors.muted} />
            </TouchableOpacity>
          </View>
        )}
      </View>
    )
  },
  (prev, next) => {
    if (prev.message !== next.message) return false
    if (prev.onSelectText !== next.onSelectText) return false
    if (prev.onEdit !== next.onEdit) return false
    if (prev.parts.length !== next.parts.length) return false
    for (let i = 0; i < prev.parts.length; i++) {
      if (prev.parts[i] !== next.parts[i]) return false
    }
    return true
  },
)

function isUserBlocked(parts: Part[]): boolean {
  return parts.length === 0
}

function Reasoning({ text, colors }: { text: string; colors: Theme }) {
  const [open, setOpen] = useState(false)
  return (
    <View style={{ marginBottom: 10 }}>
      <TouchableOpacity style={reasoningStyles.header} onPress={() => setOpen((value) => !value)}>
        <Ionicons name="sparkles-outline" size={13} color={colors.muted} />
        <Text style={[reasoningStyles.label, { color: colors.muted }]}>Thinking</Text>
        <Ionicons name={open ? "chevron-up" : "chevron-down"} size={13} color={colors.muted} />
      </TouchableOpacity>
      {open ? <Text style={[reasoningStyles.text, { color: colors.muted }]}>{text}</Text> : null}
    </View>
  )
}

const reasoningStyles = StyleSheet.create({
  header: { flexDirection: "row", alignItems: "center", gap: 6 },
  label: { fontSize: 14, fontWeight: "600" },
  text: { fontSize: 14, lineHeight: 21, marginTop: 8 },
})

function createStyles(colors: Theme) {
  return StyleSheet.create({
    assistant: { paddingHorizontal: 16, paddingTop: 24 },
    userRow: { paddingHorizontal: 15, paddingTop: 24, alignItems: "flex-end" },
    userBubble: {
      maxWidth: "78%",
      backgroundColor: colors.userBubble,
      borderRadius: 8,
      paddingLeft: 12,
      paddingRight: 13,
      paddingTop: 5,
      paddingBottom: 3,
    },
    imageScroll: { marginBottom: 8 },
    imageRow: { gap: 8 },
    imageWrap: { alignItems: "center" },
    image: { width: 180, height: 180, borderRadius: 10, backgroundColor: colors.panelAlt },
    imageLabel: { fontSize: 11, color: colors.muted, marginTop: 4, maxWidth: 180 },
    error: {
      marginTop: 10,
      padding: 12,
      borderRadius: 12,
      borderWidth: 1,
      borderColor: colors.danger,
      backgroundColor: colors.panel,
    },
    errorText: { color: colors.danger, fontSize: 14 },
    footer: { flexDirection: "row", alignItems: "center", gap: 22, marginTop: 14 },
    tokens: { color: colors.muted, fontSize: 12, marginLeft: "auto" },
    userActions: { marginTop: 6, alignItems: "flex-end" },
  })
}
