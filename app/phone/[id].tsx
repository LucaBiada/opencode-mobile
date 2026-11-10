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
  useColorScheme,
  View,
} from "react-native"
import { Stack, useLocalSearchParams } from "expo-router"
import { Ionicons } from "@expo/vector-icons"

import { MessageBubble } from "../../src/components/chat/MessageBubble"
import { phoneEngine } from "../../src/engines/phone/engine"
import type { Event, Message, Part } from "../../src/lib/sdk"

export default function PhoneChatScreen() {
  const isDark = useColorScheme() === "dark"
  const { id } = useLocalSearchParams<{ id: string }>()

  const [messages, setMessages] = useState<Message[]>([])
  const [parts, setParts] = useState<Record<string, Part[]>>({})
  const [title, setTitle] = useState("Chat")
  const [input, setInput] = useState("")
  const [sending, setSending] = useState(false)
  const [error, setError] = useState<string | null>(null)
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
        if (event.type === "session.idle") {
          setSending(false)
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

  return (
    <KeyboardAvoidingView
      style={[styles.container, isDark && styles.containerDark]}
      behavior={Platform.OS === "ios" ? "padding" : undefined}
      keyboardVerticalOffset={Platform.OS === "ios" ? 90 : 0}
    >
      <Stack.Screen options={{ title }} />
      <ScrollView ref={scroll} style={{ flex: 1 }} contentContainerStyle={styles.content}>
        {messages.length === 0 ? (
          <Text style={[styles.empty, isDark && styles.hintDark]}>
            This chat runs on your phone. No computer, no server.
          </Text>
        ) : (
          messages.map((message) => (
            <MessageBubble key={message.id} message={message} parts={parts[message.id] ?? []} isDark={isDark} />
          ))
        )}
        {sending && messages.length > 0 ? (
          <View style={styles.working}>
            <ActivityIndicator size="small" color="#4f46e5" />
            <Text style={[styles.workingText, isDark && styles.hintDark]}>Working…</Text>
          </View>
        ) : null}
        {error ? <Text style={styles.error}>{error}</Text> : null}
      </ScrollView>

      <View style={[styles.composer, isDark && styles.composerDark]}>
        <TextInput
          style={[styles.input, isDark && styles.inputDark]}
          value={input}
          onChangeText={setInput}
          placeholder="Message…"
          placeholderTextColor={isDark ? "#777" : "#999"}
          multiline
          testID="phone-composer"
        />
        <TouchableOpacity
          style={[styles.send, sending && styles.sendStop]}
          onPress={sending ? stop : send}
          disabled={!sending && input.trim().length === 0}
          testID="phone-send"
        >
          <Ionicons name={sending ? "stop" : "arrow-up"} size={20} color="#fff" />
        </TouchableOpacity>
      </View>
    </KeyboardAvoidingView>
  )
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: "#fff" },
  containerDark: { backgroundColor: "#0a0a0a" },
  content: { padding: 12, paddingBottom: 20 },
  empty: { color: "#666", textAlign: "center", marginTop: 40 },
  working: { flexDirection: "row", alignItems: "center", gap: 8, padding: 12 },
  workingText: { color: "#666", fontSize: 13 },
  error: { color: "#dc2626", padding: 12 },
  composer: {
    flexDirection: "row",
    alignItems: "flex-end",
    gap: 8,
    padding: 10,
    borderTopWidth: StyleSheet.hairlineWidth,
    borderTopColor: "#e5e5e5",
  },
  composerDark: { borderTopColor: "#222", backgroundColor: "#0a0a0a" },
  input: {
    flex: 1,
    maxHeight: 140,
    borderWidth: 1,
    borderColor: "#e2e2e2",
    borderRadius: 18,
    paddingHorizontal: 14,
    paddingTop: 10,
    paddingBottom: 10,
    fontSize: 15,
    color: "#0a0a0a",
  },
  inputDark: { borderColor: "#2a2a2a", backgroundColor: "#141414", color: "#fff" },
  send: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: "#4f46e5",
    alignItems: "center",
    justifyContent: "center",
  },
  sendStop: { backgroundColor: "#dc2626" },
  hintDark: { color: "#999" },
})
