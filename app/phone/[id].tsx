import { useCallback, useEffect, useMemo, useRef, useState } from "react"
import {
  ActivityIndicator,
  Alert,
  KeyboardAvoidingView,
  Platform,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from "react-native"
import { router, Stack, useLocalSearchParams } from "expo-router"
import { Ionicons } from "@expo/vector-icons"
import { useSafeAreaInsets } from "react-native-safe-area-context"

import { MessageBubble } from "../../src/components/chat/MessageBubble"
import { useTheme, type Theme } from "../../src/theme"
import { phoneEngine } from "../../src/engines/phone/engine"
import type { Event, Message, Part } from "../../src/lib/sdk"

function shortModel(modelID: string): string {
  const tail = modelID.split("/").pop() ?? modelID
  return tail.replace(/-GGUF$/i, "").replace(/^unsloth\//i, "")
}

export default function PhoneChatScreen() {
  const { id } = useLocalSearchParams<{ id: string }>()
  const insets = useSafeAreaInsets()
  const colors = useTheme()
  const styles = useMemo(() => createStyles(colors), [colors])

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

  const openMenu = () => {
    Alert.alert(title, "Phone chat", [
      { text: "Cancel", style: "cancel" },
      {
        text: "Delete chat",
        style: "destructive",
        onPress: async () => {
          if (!id) return
          await phoneEngine.deleteSession(id)
          router.back()
        },
      },
    ])
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
                Phone mode
              </Text>
            </View>
          ),
          headerRight: () => (
            <View style={styles.headerActions}>
              {sending ? (
                <TouchableOpacity onPress={() => void stop()} hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}>
                  <View style={styles.stopRing} />
                </TouchableOpacity>
              ) : null}
              <TouchableOpacity onPress={openMenu} hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}>
                <Ionicons name="ellipsis-vertical" size={20} color={colors.muted} />
              </TouchableOpacity>
            </View>
          ),
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
            <MessageBubble key={message.id} message={message} parts={parts[message.id] ?? []} onEdit={undefined} />
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

      <View style={[styles.bottom, { paddingBottom: Math.max(insets.bottom, 8) + 16 }]}>
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

function createStyles(colors: Theme) {
  return StyleSheet.create({
  container: { flex: 1, backgroundColor: colors.bg },
  headerTitle: { alignItems: "center", maxWidth: 220 },
  title: { color: colors.text, fontSize: 16, fontWeight: "600" },
  subtitle: { color: colors.muted, fontSize: 13, marginTop: 1 },
  headerActions: { flexDirection: "row", alignItems: "center", gap: 12, paddingRight: 2 },
  stopRing: { width: 22, height: 22, borderRadius: 11, borderWidth: 3, borderColor: colors.accent },
  content: { paddingBottom: 8 },
  empty: { paddingHorizontal: 28, paddingTop: 90, alignItems: "center", gap: 10 },
  emptyTitle: { color: colors.text, fontSize: 20, fontWeight: "600", textAlign: "center" },
  emptyBody: { color: colors.muted, fontSize: 15, lineHeight: 23, textAlign: "center" },
  working: { paddingVertical: 16, alignItems: "center" },
  error: { color: colors.danger, paddingHorizontal: 22, paddingTop: 12, fontSize: 15 },
  bottom: { paddingBottom: 10 },
  approval: {
    marginHorizontal: 12,
    marginBottom: 8,
    borderWidth: 1,
    borderColor: colors.accent,
    backgroundColor: colors.panel,
    borderRadius: 18,
    padding: 16,
    gap: 10,
  },
  approvalTitle: { color: colors.text, fontWeight: "600", fontSize: 16 },
  approvalPreview: {
    color: colors.muted,
    fontFamily: Platform.select({ ios: "Menlo", android: "monospace" }),
    fontSize: 13,
    lineHeight: 20,
  },
  approvalActions: { flexDirection: "row", gap: 8, justifyContent: "flex-end", marginTop: 2 },
  approvalButton: { paddingVertical: 9, paddingHorizontal: 16, borderRadius: 11 },
  approvalGhost: { backgroundColor: colors.panelAlt },
  approvalPrimary: { backgroundColor: colors.accent },
  approvalButtonText: { color: "#fff", fontWeight: "600", fontSize: 14 },
  composer: {
    marginHorizontal: 15,
    borderWidth: 1,
    borderColor: colors.border,
    backgroundColor: colors.panel,
    borderRadius: 18,
    paddingHorizontal: 14,
    paddingTop: 15,
    paddingBottom: 15,
    gap: 7,
  },
  input: { color: colors.text, fontSize: 17, lineHeight: 22, maxHeight: 140, paddingVertical: 0 },
  composerRow: { flexDirection: "row", alignItems: "center", gap: 8 },
  roundButton: {
    width: 38,
    height: 38,
    borderRadius: 19,
    backgroundColor: colors.panelAlt,
    alignItems: "center",
    justifyContent: "center",
  },
  roundDisabled: { opacity: 0.45 },
  modelChip: {
    height: 38,
    borderRadius: 19,
    paddingHorizontal: 14,
    backgroundColor: colors.panelAlt,
    alignItems: "center",
    justifyContent: "center",
    maxWidth: 210,
  },
  modelChipText: { color: colors.textDim, fontSize: 14, fontWeight: "500" },
  send: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: colors.accent,
    alignItems: "center",
    justifyContent: "center",
  },
  sendStop: { backgroundColor: colors.accentPressed },
  })
}
