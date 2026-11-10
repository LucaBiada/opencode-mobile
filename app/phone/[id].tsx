import { useCallback, useEffect, useRef, useState } from "react"
import {
  ActivityIndicator,
  KeyboardAvoidingView,
  Platform,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from "react-native"
import { Stack, useLocalSearchParams } from "expo-router"
import { Ionicons } from "@expo/vector-icons"

import { PhoneMessage } from "../../src/components/phone/PhoneMessage"
import { phoneColors as colors } from "../../src/components/phone/theme"
import { phoneEngine } from "../../src/engines/phone/engine"
import type { Event, Message, Part } from "../../src/lib/sdk"

function shortModel(modelID: string): string {
  const tail = modelID.split("/").pop() ?? modelID
  return tail.replace(/-GGUF$/i, "").replace(/^unsloth\//i, "")
}

export default function PhoneChatScreen() {
  const { id } = useLocalSearchParams<{ id: string }>()

  const [messages, setMessages] = useState<Message[]>([])
  const [parts, setParts] = useState<Record<string, Part[]>>({})
  const [title, setTitle] = useState("Chat")
  const [modelID, setModelID] = useState("")
  const [input, setInput] = useState("")
  const [sending, setSending] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [approval, setApproval] = useState<{ id: string; tool: string; preview?: string } | null>(null)
  const scroll = useRef<ScrollView>(null)

  const upsertMessage = useCallback((message: Message) => {
    setMessages((current) => {
      const index = current.findIndex((item) => item.id === message.id)
      if (index === -1) return [...current, message]
      const next = [...current]
      next[index] = { ...next[index], ...message }
      return next
    })
  }, [])

  const upsertPart = useCallback((part: Part) => {
    setParts((current) => {
      const list = current[part.messageID] ?? []
      const index = list.findIndex((item) => item.id === part.id)
      const next = index === -1 ? [...list, part] : list.map((item) => (item.id === part.id ? part : item))
      return { ...current, [part.messageID]: next }
    })
  }, [])

  useEffect(() => {
    if (!id) return
    let active = true
    void (async () => {
      const session = await phoneEngine.getSession(id).catch(() => null)
      if (!active || !session) return
      setTitle(session.title)
      setModelID(session.version)
      const loaded = await phoneEngine.getMessages(id)
      if (!active) return
      setMessages(loaded.map((entry) => entry.info))
      setParts(Object.fromEntries(loaded.map((entry) => [entry.info.id, entry.parts])))
    })()

    const controller = new AbortController()
    void (async () => {
      for await (const event of phoneEngine.events(controller.signal)) {
        const payload = (event as Event).properties as Record<string, unknown>
        const sessionID = (payload.sessionID ?? (payload.info as Message | undefined)?.sessionID) as string | undefined
        if (sessionID && sessionID !== id) continue
        if (event.type === "message.updated") {
          const info = payload.info as Message | undefined
          if (info) upsertMessage(info)
          continue
        }
        if (event.type === "part.updated") {
          const part = payload.part as Part | undefined
          if (part) upsertPart(part)
          continue
        }
        if (event.type === "permission.asked") {
          setApproval({
            id: String(payload.id),
            tool: String(payload.tool),
            preview: typeof payload.preview === "string" ? payload.preview : undefined,
          })
          continue
        }
        if (event.type === "session.idle") {
          setSending(false)
          setApproval(null)
          continue
        }
        if (event.type === "session.error") {
          setError(String(payload.error ?? "Request failed"))
          setSending(false)
        }
      }
    })()

    return () => {
      active = false
      controller.abort()
    }
  }, [id, upsertMessage, upsertPart])

  useEffect(() => {
    const timer = setTimeout(() => scroll.current?.scrollToEnd({ animated: true }), 60)
    return () => clearTimeout(timer)
  }, [messages, parts])

  const send = async () => {
    const text = input.trim()
    if (!text || !id || sending) return
    setInput("")
    setError(null)
    setSending(true)
    try {
      await phoneEngine.prompt(id, { parts: [{ type: "text", text }] })
    } catch (err) {
      setError(err instanceof Error ? err.message : String(err))
      setSending(false)
    }
  }

  const stop = async () => {
    if (id) await phoneEngine.abort(id)
  }

  const decide = async (reply: "once" | "always" | "reject") => {
    if (!approval) return
    const requestID = approval.id
    setApproval(null)
    await phoneEngine.replyPermission(requestID, reply)
  }

  return (
    <KeyboardAvoidingView
      style={styles.container}
      behavior={Platform.OS === "ios" ? "padding" : undefined}
      keyboardVerticalOffset={Platform.OS === "ios" ? 90 : 0}
    >
      <Stack.Screen
        options={{
          headerStyle: { backgroundColor: colors.bg },
          headerShadowVisible: false,
          headerTintColor: colors.text,
          headerTitleAlign: "center",
          headerTitle: () => (
            <View style={styles.headerTitle}>
              <Text style={styles.title} numberOfLines={1}>
                {title}
              </Text>
              <Text style={styles.subtitle} numberOfLines={1}>
                Phone · {shortModel(modelID)}
              </Text>
            </View>
          ),
          headerRight: () =>
            sending ? (
              <TouchableOpacity onPress={() => void stop()} hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}>
                <View style={styles.stopRing} />
              </TouchableOpacity>
            ) : null,
        }}
      />

      <ScrollView ref={scroll} style={{ flex: 1 }} contentContainerStyle={styles.content}>
        {messages.length === 0 ? (
          <View style={styles.empty}>
            <Text style={styles.emptyTitle}>This chat runs on your phone</Text>
            <Text style={styles.emptyBody}>No computer, no server. Files the agent writes stay in its workspace.</Text>
          </View>
        ) : (
          messages.map((message) => (
            <PhoneMessage key={message.id} message={message} parts={parts[message.id] ?? []} />
          ))
        )}
        {sending && messages.length > 0 ? (
          <View style={styles.working}>
            <ActivityIndicator size="small" color={colors.accent} />
          </View>
        ) : null}
        {error ? <Text style={styles.error}>{error}</Text> : null}
        <View style={{ height: 12 }} />
      </ScrollView>

      <View style={styles.bottom}>
        {approval ? (
          <View style={styles.approval}>
            <Text style={styles.approvalTitle}>Allow {approval.tool}?</Text>
            {approval.preview ? (
              <Text style={styles.approvalPreview} numberOfLines={5}>
                {approval.preview}
              </Text>
            ) : null}
            <View style={styles.approvalActions}>
              <TouchableOpacity style={[styles.approvalButton, styles.approvalGhost]} onPress={() => void decide("reject")}>
                <Text style={[styles.approvalButtonText, { color: colors.textDim }]}>Reject</Text>
              </TouchableOpacity>
              <TouchableOpacity style={[styles.approvalButton, styles.approvalGhost]} onPress={() => void decide("always")}>
                <Text style={[styles.approvalButtonText, { color: colors.textDim }]}>Always</Text>
              </TouchableOpacity>
              <TouchableOpacity style={[styles.approvalButton, styles.approvalPrimary]} onPress={() => void decide("once")}>
                <Text style={styles.approvalButtonText}>Allow once</Text>
              </TouchableOpacity>
            </View>
          </View>
        ) : null}

        <View style={styles.composer}>
          <TextInput
            style={styles.input}
            value={input}
            onChangeText={setInput}
            placeholder="Also, add"
            placeholderTextColor={colors.muted}
            multiline
            testID="phone-composer"
          />
          <View style={styles.composerRow}>
            <View style={[styles.roundButton, styles.roundDisabled]}>
              <Ionicons name="add" size={22} color={colors.muted} />
            </View>
            <View style={styles.modelChip}>
              <Text style={styles.modelChipText} numberOfLines={1}>
                {modelID ? shortModel(modelID) : "Model"}
              </Text>
            </View>
            <View style={{ flex: 1 }} />
            <View style={[styles.roundButton, styles.roundDisabled]}>
              <Ionicons name="mic-outline" size={18} color={colors.muted} />
            </View>
            <TouchableOpacity
              style={[styles.send, sending && styles.sendStop]}
              onPress={sending ? stop : send}
              disabled={!sending && input.trim().length === 0}
              testID="phone-send"
            >
              <Ionicons name={sending ? "stop" : "arrow-up"} size={20} color="#fff" />
            </TouchableOpacity>
          </View>
        </View>
      </View>
    </KeyboardAvoidingView>
  )
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: colors.bg },
  headerTitle: { alignItems: "center", maxWidth: 220 },
  title: { color: colors.text, fontSize: 17, fontWeight: "600" },
  subtitle: { color: colors.muted, fontSize: 12, marginTop: 1 },
  stopRing: { width: 22, height: 22, borderRadius: 11, borderWidth: 3, borderColor: colors.accent },
  content: { paddingBottom: 8 },
  empty: { paddingHorizontal: 28, paddingTop: 80, alignItems: "center", gap: 8 },
  emptyTitle: { color: colors.text, fontSize: 18, fontWeight: "600", textAlign: "center" },
  emptyBody: { color: colors.muted, fontSize: 14, lineHeight: 21, textAlign: "center" },
  working: { paddingVertical: 14, alignItems: "center" },
  error: { color: colors.danger, paddingHorizontal: 16, paddingTop: 12, fontSize: 14 },
  bottom: { paddingBottom: 10 },
  approval: {
    marginHorizontal: 12,
    marginBottom: 8,
    borderWidth: 1,
    borderColor: colors.accent,
    backgroundColor: colors.panel,
    borderRadius: 16,
    padding: 14,
    gap: 8,
  },
  approvalTitle: { color: colors.text, fontWeight: "600", fontSize: 15 },
  approvalPreview: {
    color: colors.muted,
    fontFamily: Platform.select({ ios: "Menlo", android: "monospace" }),
    fontSize: 12,
    lineHeight: 18,
  },
  approvalActions: { flexDirection: "row", gap: 8, justifyContent: "flex-end", marginTop: 2 },
  approvalButton: { paddingVertical: 8, paddingHorizontal: 14, borderRadius: 10 },
  approvalGhost: { backgroundColor: colors.panelAlt },
  approvalPrimary: { backgroundColor: colors.accent },
  approvalButtonText: { color: "#fff", fontWeight: "600", fontSize: 13 },
  composer: {
    marginHorizontal: 12,
    borderWidth: 1,
    borderColor: colors.border,
    backgroundColor: colors.panel,
    borderRadius: 24,
    paddingHorizontal: 14,
    paddingTop: 8,
    paddingBottom: 10,
    gap: 6,
  },
  input: { color: colors.text, fontSize: 17, lineHeight: 23, maxHeight: 140, paddingVertical: 6 },
  composerRow: { flexDirection: "row", alignItems: "center", gap: 8 },
  roundButton: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: colors.panelAlt,
    alignItems: "center",
    justifyContent: "center",
  },
  roundDisabled: { opacity: 0.45 },
  modelChip: {
    height: 40,
    borderRadius: 20,
    paddingHorizontal: 16,
    backgroundColor: colors.panelAlt,
    alignItems: "center",
    justifyContent: "center",
    maxWidth: 200,
  },
  modelChipText: { color: colors.textDim, fontSize: 14, fontWeight: "500" },
  send: {
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: colors.accent,
    alignItems: "center",
    justifyContent: "center",
  },
  sendStop: { backgroundColor: colors.accentPressed },
})
