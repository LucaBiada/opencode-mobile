import { memo, useState } from "react"
import { Share, StyleSheet, Text, TouchableOpacity, View } from "react-native"
import { Ionicons } from "@expo/vector-icons"
import * as Clipboard from "expo-clipboard"

import { Markdown } from "../markdown"
import type { Message, Part } from "../../lib/sdk"
import { phoneColors as colors } from "./theme"

function plainText(parts: Part[]): string {
  return parts
    .filter((part) => part.type === "text" && part.text)
    .map((part) => part.text as string)
    .join("\n")
}

function Reasoning({ text }: { text: string }) {
  const [open, setOpen] = useState(false)
  return (
    <View style={styles.reasoning}>
      <TouchableOpacity style={styles.reasoningHeader} onPress={() => setOpen((value) => !value)}>
        <Ionicons name="sparkles-outline" size={13} color={colors.muted} />
        <Text style={styles.reasoningLabel}>Thinking</Text>
        <Ionicons name={open ? "chevron-up" : "chevron-down"} size={13} color={colors.muted} />
      </TouchableOpacity>
      {open ? <Text style={styles.reasoningText}>{text}</Text> : null}
    </View>
  )
}

function ToolRow({ part }: { part: Part }) {
  const [open, setOpen] = useState(false)
  const status = part.state?.status ?? "running"
  const colour = status === "completed" ? colors.success : status === "error" ? colors.danger : colors.muted
  const detail =
    typeof part.state?.output === "string"
      ? part.state.output
      : part.state?.output
        ? JSON.stringify(part.state.output, null, 2)
        : part.state?.error?.message ?? (part.state?.input ? JSON.stringify(part.state.input, null, 2) : "")

  return (
    <View style={styles.tool}>
      <TouchableOpacity style={styles.toolHeader} onPress={() => setOpen((value) => !value)} disabled={!detail}>
        <Ionicons
          name={status === "error" ? "alert-circle-outline" : "build-outline"}
          size={14}
          color={colour}
        />
        <Text style={styles.toolName}>{part.tool ?? "tool"}</Text>
        <View style={styles.spacer} />
        {status === "completed" ? (
          <Ionicons name="checkmark" size={14} color={colour} />
        ) : status === "error" ? (
          <Ionicons name="close" size={14} color={colour} />
        ) : (
          <View style={[styles.dot, { backgroundColor: colour }]} />
        )}
        {detail ? <Ionicons name={open ? "chevron-up" : "chevron-down"} size={13} color={colors.muted} /> : null}
      </TouchableOpacity>
      {open && detail ? <Text style={styles.toolOutput}>{detail.slice(0, 2000)}</Text> : null}
    </View>
  )
}

export const PhoneMessage = memo(function PhoneMessage({ message, parts }: { message: Message; parts: Part[] }) {
  const isUser = message.role === "user"
  const textParts = parts.filter((part) => part.type === "text" && part.text)
  const reasoning = parts.find((part) => part.type === "reasoning" && part.text)
  const tools = parts.filter((part) => part.type === "tool")
  const text = plainText(parts)

  if (isUser) {
    return (
      <View style={styles.userRow}>
        <View style={styles.userBubble}>
          <Markdown variant="phone">{text}</Markdown>
        </View>
      </View>
    )
  }

  return (
    <View style={styles.assistant}>
      {reasoning ? <Reasoning text={reasoning.text as string} /> : null}
      {text ? <Markdown variant="phone">{text}</Markdown> : null}
      {tools.map((part) => (
        <ToolRow key={part.id} part={part} />
      ))}
      {message.error ? <Text style={styles.error}>{message.error.message}</Text> : null}
      {text && !message.error ? (
        <View style={styles.actions}>
          <TouchableOpacity
            style={styles.action}
            onPress={() => void Clipboard.setStringAsync(text)}
            hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
          >
            <Ionicons name="copy-outline" size={19} color={colors.muted} />
          </TouchableOpacity>
          <TouchableOpacity
            style={styles.action}
            onPress={() => void Share.share({ message: text })}
            hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
          >
            <Ionicons name="share-outline" size={19} color={colors.muted} />
          </TouchableOpacity>
        </View>
      ) : null}
    </View>
  )
})

const styles = StyleSheet.create({
  assistant: { paddingHorizontal: 16, paddingTop: 24 },
  userRow: { paddingHorizontal: 15, paddingTop: 24, alignItems: "flex-end" },
  userBubble: {
    maxWidth: "78%",
    backgroundColor: "#0D0D0E",
    borderRadius: 8,
    paddingLeft: 12,
    paddingRight: 13,
    paddingTop: 16,
    paddingBottom: 13,
  },
  reasoning: { marginBottom: 10 },
  reasoningHeader: { flexDirection: "row", alignItems: "center", gap: 6 },
  reasoningLabel: { color: colors.muted, fontSize: 14, fontWeight: "600" },
  reasoningText: { color: colors.muted, fontSize: 14, lineHeight: 21, marginTop: 8 },
  tool: {
    borderWidth: 1,
    borderColor: colors.border,
    backgroundColor: colors.panel,
    borderRadius: 14,
    paddingHorizontal: 14,
    paddingVertical: 12,
    marginTop: 12,
  },
  toolHeader: { flexDirection: "row", alignItems: "center", gap: 8 },
  toolName: { color: colors.textDim, fontSize: 14, fontWeight: "600" },
  spacer: { flex: 1 },
  dot: { width: 7, height: 7, borderRadius: 4 },
  toolOutput: {
    color: colors.muted,
    fontFamily: "monospace",
    fontSize: 13,
    lineHeight: 19,
    marginTop: 10,
  },
  error: { color: colors.danger, fontSize: 15, marginTop: 10 },
  actions: { flexDirection: "row", gap: 26, marginTop: 14 },
  action: { opacity: 0.95 },
})
