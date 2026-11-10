import { useCallback, useState } from "react"
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
  useColorScheme,
  View,
} from "react-native"
import { router, Stack, useFocusEffect } from "expo-router"
import { Ionicons } from "@expo/vector-icons"
import { useTranslation } from "react-i18next"

import type { Session } from "../../src/lib/sdk"
import { getGoApiKey, setGoApiKey } from "../../src/lib/phone/key"
import { loadGoModels, type GoModel } from "../../src/lib/phone/models"
import { phoneEngine } from "../../src/engines/phone/engine"

const DEFAULT_MODEL = "deepseek-v4.1-flash"

export default function PhoneModeScreen() {
  const isDark = useColorScheme() === "dark"
  const { t } = useTranslation()

  const [keyInput, setKeyInput] = useState("")
  const [hasKey, setHasKey] = useState(false)
  const [models, setModels] = useState<GoModel[]>([])
  const [modelID, setModelID] = useState(DEFAULT_MODEL)
  const [sessions, setSessions] = useState<Session[]>([])
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const refresh = useCallback(async () => {
    const key = await getGoApiKey()
    setHasKey(Boolean(key))
    setSessions(await phoneEngine.listSessions())
    if (!key) return
    try {
      setModels(await loadGoModels(key))
      setError(null)
    } catch (err) {
      setError(err instanceof Error ? err.message : String(err))
    }
  }, [])

  useFocusEffect(
    useCallback(() => {
      void refresh()
    }, [refresh]),
  )

  const saveKey = async () => {
    setBusy(true)
    setError(null)
    try {
      await setGoApiKey(keyInput)
      const key = keyInput.trim()
      setHasKey(Boolean(key))
      if (key) setModels(await loadGoModels(key, true))
      setKeyInput("")
      if (!key) setModels([])
    } catch (err) {
      setError(err instanceof Error ? err.message : String(err))
    } finally {
      setBusy(false)
    }
  }

  const startChat = async () => {
    setBusy(true)
    try {
      const session = await phoneEngine.createSession({ title: "New chat", modelID })
      setSessions(await phoneEngine.listSessions())
      router.push({ pathname: "/phone/[id]", params: { id: session.id } })
    } catch (err) {
      Alert.alert("Could not start chat", err instanceof Error ? err.message : String(err))
    } finally {
      setBusy(false)
    }
  }

  const remove = (session: Session) => {
    Alert.alert("Delete chat?", session.title, [
      { text: t("common.cancel"), style: "cancel" },
      {
        text: t("common.delete", { defaultValue: "Delete" }),
        style: "destructive",
        onPress: async () => {
          await phoneEngine.deleteSession(session.id)
          setSessions(await phoneEngine.listSessions())
        },
      },
    ])
  }

  return (
    <View style={[styles.container, isDark && styles.containerDark]}>
      <Stack.Screen options={{ title: "Phone mode" }} />
      <ScrollView contentContainerStyle={styles.content} keyboardShouldPersistTaps="handled">
        <Text style={[styles.heading, isDark && styles.textDark]}>Chat with no computer</Text>
        <Text style={[styles.sub, isDark && styles.hintDark]}>
          Uses your OpenCode Go key. Sessions are stored on this phone and never leave it except as
          prompts to Go.
        </Text>

        <Text style={[styles.label, isDark && styles.textDark]}>OpenCode Go API key</Text>
        <View style={[styles.keyRow]}>
          <TextInput
            style={[styles.input, isDark && styles.inputDark]}
            value={keyInput}
            onChangeText={setKeyInput}
            placeholder={hasKey ? "Key saved — paste a new one to replace" : "sk-…"}
            placeholderTextColor={isDark ? "#666" : "#999"}
            autoCapitalize="none"
            autoCorrect={false}
            secureTextEntry
            testID="go-key-input"
          />
        </View>
        <TouchableOpacity style={[styles.button, busy && styles.buttonDisabled]} onPress={saveKey} disabled={busy} testID="go-key-save">
          {busy ? <ActivityIndicator color="#fff" /> : <Text style={styles.buttonText}>{hasKey ? "Update key" : "Save key"}</Text>}
        </TouchableOpacity>
        {error ? <Text style={styles.error}>{error}</Text> : null}
        {hasKey && models.length > 0 ? (
          <>
            <Text style={[styles.label, styles.spaced, isDark && styles.textDark]}>Model</Text>
            <View style={styles.models}>
              {models.map((model) => {
                const active = model.id === modelID
                return (
                  <TouchableOpacity
                    key={model.id}
                    style={[styles.modelChip, active && styles.modelChipActive]}
                    onPress={() => setModelID(model.id)}
                  >
                    <Text style={[styles.modelText, active && styles.modelTextActive]}>{model.name}</Text>
                  </TouchableOpacity>
                )
              })}
            </View>
          </>
        ) : null}

        <TouchableOpacity
          style={[styles.button, styles.primary, (!hasKey || busy) && styles.buttonDisabled]}
          onPress={startChat}
          disabled={!hasKey || busy}
          testID="start-phone-chat"
        >
          <Ionicons name="add" size={18} color="#fff" />
          <Text style={styles.buttonText}>New phone chat</Text>
        </TouchableOpacity>

        <Text style={[styles.label, styles.spaced, isDark && styles.textDark]}>On this phone</Text>
        {sessions.length === 0 ? (
          <Text style={[styles.empty, isDark && styles.hintDark]}>No phone sessions yet.</Text>
        ) : (
          sessions.map((session) => (
            <TouchableOpacity
              key={session.id}
              style={[styles.sessionRow, isDark && styles.sessionRowDark]}
              onPress={() => router.push({ pathname: "/phone/[id]", params: { id: session.id } })}
              onLongPress={() => remove(session)}
            >
              <View style={styles.sessionText}>
                <Text style={[styles.sessionTitle, isDark && styles.textDark]} numberOfLines={1}>
                  {session.title}
                </Text>
                <Text style={[styles.sessionMeta, isDark && styles.hintDark]}>
                  {new Date(session.time.updated).toLocaleString()}
                </Text>
              </View>
              <Ionicons name="chevron-forward" size={18} color={isDark ? "#888" : "#666"} />
            </TouchableOpacity>
          ))
        )}
      </ScrollView>
    </View>
  )
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: "#fff" },
  containerDark: { backgroundColor: "#0a0a0a" },
  content: { padding: 20, paddingBottom: 40 },
  heading: { fontSize: 22, fontWeight: "700", color: "#0a0a0a" },
  sub: { fontSize: 13, color: "#666", marginTop: 6, lineHeight: 19 },
  label: { fontSize: 13, fontWeight: "600", color: "#0a0a0a", marginTop: 20 },
  spaced: { marginTop: 28 },
  keyRow: { marginTop: 8 },
  input: {
    borderWidth: 1,
    borderColor: "#e2e2e2",
    borderRadius: 10,
    paddingHorizontal: 12,
    paddingVertical: Platform.OS === "ios" ? 12 : 9,
    fontSize: 15,
    color: "#0a0a0a",
  },
  inputDark: { borderColor: "#2a2a2a", backgroundColor: "#141414", color: "#fff" },
  button: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 8,
    backgroundColor: "#333",
    borderRadius: 10,
    paddingVertical: 12,
    marginTop: 10,
  },
  primary: { backgroundColor: "#4f46e5" },
  buttonDisabled: { opacity: 0.5 },
  buttonText: { color: "#fff", fontWeight: "600" },
  error: { color: "#dc2626", marginTop: 10, fontSize: 13 },
  models: { flexDirection: "row", flexWrap: "wrap", gap: 8, marginTop: 8 },
  modelChip: { borderWidth: 1, borderColor: "#d4d4d4", borderRadius: 999, paddingHorizontal: 12, paddingVertical: 6 },
  modelChipActive: { backgroundColor: "#4f46e5", borderColor: "#4f46e5" },
  modelText: { fontSize: 12, color: "#333" },
  modelTextActive: { color: "#fff", fontWeight: "600" },
  empty: { color: "#666", marginTop: 8 },
  sessionRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingVertical: 12,
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: "#e5e5e5",
  },
  sessionRowDark: { borderBottomColor: "#222" },
  sessionText: { flex: 1, paddingRight: 12 },
  sessionTitle: { fontSize: 15, fontWeight: "600", color: "#0a0a0a" },
  sessionMeta: { fontSize: 12, color: "#666", marginTop: 2 },
  textDark: { color: "#fff" },
  hintDark: { color: "#999" },
})
