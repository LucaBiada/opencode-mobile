import { useCallback, useMemo, useState } from "react"
import {
  ActivityIndicator,
  Alert,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  useColorScheme,
  View,
} from "react-native"
import AsyncStorage from "@react-native-async-storage/async-storage"
import { router, Stack, useFocusEffect } from "expo-router"
import { Ionicons } from "@expo/vector-icons"
import { useTranslation } from "react-i18next"

import type { Session } from "../../src/lib/sdk"
import { getProviderKey, setProviderKey } from "../../src/lib/phone/key"
import { loadProviderModels, type GoModel } from "../../src/lib/phone/models"
import {
  DEFAULT_PROVIDER_ID,
  PRESETS,
  modelsURLFor,
  providerProblem,
  type Provider,
} from "../../src/lib/phone/providers"
import { listProviders, seedProviders, upsertProvider } from "../../src/engines/phone/store"
import { phoneEngine } from "../../src/engines/phone/engine"
import { useTheme, type Theme } from "../../src/theme"

const LAST_PROVIDER_KEY = "devmote_last_provider"

export default function PhoneModeScreen() {
  const isDark = useColorScheme() === "dark"
  const colors = useTheme()
  const styles = useMemo(() => createStyles(colors), [colors])
  const { t } = useTranslation()

  const [providers, setProviders] = useState<Provider[]>([])
  const [providerID, setProviderID] = useState(DEFAULT_PROVIDER_ID)
  const [baseURL, setBaseURL] = useState("")
  const [keyInput, setKeyInput] = useState("")
  const [hasKey, setHasKey] = useState(false)
  const [models, setModels] = useState<GoModel[]>([])
  const [modelID, setModelID] = useState("")
  const [sessions, setSessions] = useState<Session[]>([])
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const selectProvider = useCallback(async (provider: Provider) => {
    setProviderID(provider.id)
    setBaseURL(provider.baseURL)
    setModels([])
    setModelID("")
    setError(null)
    await AsyncStorage.setItem(LAST_PROVIDER_KEY, provider.id)
    const key = await getProviderKey(provider.id)
    setHasKey(Boolean(key))
    if (provider.requiresKey && !key) return
    try {
      const list = await loadProviderModels(provider, key)
      setModels(list)
      setModelID(list[0]?.id ?? "")
    } catch (err) {
      setError(err instanceof Error ? err.message : String(err))
    }
  }, [])

  const refresh = useCallback(async () => {
    await seedProviders(PRESETS)
    const list = await listProviders()
    setProviders(list)
    const saved = (await AsyncStorage.getItem(LAST_PROVIDER_KEY)) ?? DEFAULT_PROVIDER_ID
    const current = list.find((provider) => provider.id === saved) ?? list[0]
    if (current) await selectProvider(current)
    setSessions(await phoneEngine.listSessions())
  }, [selectProvider])

  useFocusEffect(
    useCallback(() => {
      void refresh()
    }, [refresh]),
  )

  const saveProvider = async () => {
    const current = providers.find((provider) => provider.id === providerID)
    if (!current) return
    const next: Provider = { ...current, baseURL: baseURL.trim(), modelsURL: modelsURLFor(baseURL.trim()) }
    const problem = providerProblem(next)
    if (problem) {
      setError(problem)
      return
    }
    setBusy(true)
    setError(null)
    try {
      await upsertProvider(next)
      if (keyInput.trim()) await setProviderKey(next.id, keyInput.trim())
      setKeyInput("")
      setHasKey(Boolean(await getProviderKey(next.id)))
      setProviders(await listProviders())
      const key = await getProviderKey(next.id)
      const list = await loadProviderModels(next, key, true)
      setModels(list)
      setModelID(list[0]?.id ?? "")
    } catch (err) {
      setError(err instanceof Error ? err.message : String(err))
    } finally {
      setBusy(false)
    }
  }

  const startChat = async () => {
    if (!modelID) return
    setBusy(true)
    try {
      const session = await phoneEngine.createSession({ title: "New chat", providerID, modelID })
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

  const current = providers.find((provider) => provider.id === providerID)

  return (
    <View style={[styles.container, isDark && styles.containerDark]}>
      <Stack.Screen options={{ title: "Phone mode" }} />
      <ScrollView contentContainerStyle={styles.content} keyboardShouldPersistTaps="handled">
        <Text style={[styles.heading, isDark && styles.textDark]}>Chat with no computer</Text>
        <Text style={[styles.sub, isDark && styles.hintDark]}>
          Point the app at a cloud API or a model server on your network. Sessions stay on this phone.
        </Text>

        <Text style={[styles.label, isDark && styles.textDark]}>Provider</Text>
        <View style={styles.models}>
          {providers.map((provider) => {
            const active = provider.id === providerID
            return (
              <TouchableOpacity
                key={provider.id}
                style={[styles.modelChip, active && styles.modelChipActive]}
                onPress={() => void selectProvider(provider)}
              >
                <Text style={[styles.modelText, active && styles.modelTextActive]}>{provider.name}</Text>
              </TouchableOpacity>
            )
          })}
        </View>

        {current ? (
          <>
            <Text style={[styles.label, styles.spaced, isDark && styles.textDark]}>Server URL</Text>
            <TextInput
              style={[styles.input, isDark && styles.inputDark]}
              value={baseURL}
              onChangeText={setBaseURL}
              autoCapitalize="none"
              autoCorrect={false}
              keyboardType="url"
              placeholder="http://192.168.1.9:11434/v1"
              placeholderTextColor={colors.muted}
              testID="provider-url"
            />
            {current.builtin && providerID !== DEFAULT_PROVIDER_ID ? (
              <Text style={[styles.hint, isDark && styles.hintDark]}>
                On a phone, localhost is the phone. Use your computer's LAN address.
              </Text>
            ) : null}

            {current.requiresKey ? (
              <>
                <Text style={[styles.label, styles.spaced, isDark && styles.textDark]}>API key</Text>
                <TextInput
                  style={[styles.input, isDark && styles.inputDark]}
                  value={keyInput}
                  onChangeText={setKeyInput}
                  placeholder={hasKey ? "Key saved — paste a new one to replace" : "oc_sk_…"}
                  placeholderTextColor={colors.muted}
                  autoCapitalize="none"
                  autoCorrect={false}
                  secureTextEntry
                  testID="provider-key"
                />
              </>
            ) : null}

            <TouchableOpacity style={[styles.button, busy && styles.buttonDisabled]} onPress={saveProvider} disabled={busy} testID="provider-save">
              {busy ? <ActivityIndicator color={colors.onAccent} /> : <Text style={styles.buttonText}>Save & test</Text>}
            </TouchableOpacity>
            {error ? <Text style={styles.error}>{error}</Text> : null}

            {models.length > 0 ? (
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
              style={[styles.button, styles.primary, (!modelID || busy) && styles.buttonDisabled]}
              onPress={startChat}
              disabled={!modelID || busy}
              testID="start-phone-chat"
            >
              <Ionicons name="add" size={18} color={colors.onAccent} />
              <Text style={styles.buttonText}>New phone chat</Text>
            </TouchableOpacity>
          </>
        ) : null}

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
                  {session.version} · {new Date(session.time.updated).toLocaleString()}
                </Text>
              </View>
              <Ionicons name="chevron-forward" size={18} color={colors.muted} />
            </TouchableOpacity>
          ))
        )}
      </ScrollView>
    </View>
  )
}

function createStyles(colors: Theme) {
  return StyleSheet.create({
  container: { flex: 1, backgroundColor: colors.panel },
  containerDark: { backgroundColor: colors.bg },
  content: { padding: 20, paddingBottom: 40 },
  heading: { fontSize: 22, fontWeight: "700", color: colors.text },
  sub: { fontSize: 13, color: colors.muted, marginTop: 6, lineHeight: 19 },
  label: { fontSize: 13, fontWeight: "600", color: colors.text, marginTop: 20 },
  spaced: { marginTop: 28 },
  input: {
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: 10,
    paddingHorizontal: 12,
    paddingVertical: 9,
    fontSize: 15,
    color: colors.text,
    marginTop: 8,
  },
  inputDark: { borderColor: colors.border, backgroundColor: colors.panelAlt, color: colors.onAccent },
  hint: { fontSize: 12, color: colors.muted, marginTop: 6 },
  button: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 8,
    backgroundColor: colors.panelAlt,
    borderRadius: 10,
    paddingVertical: 12,
    marginTop: 10,
  },
  primary: { backgroundColor: colors.accent },
  buttonDisabled: { opacity: 0.5 },
  buttonText: { color: colors.onAccent, fontWeight: "600" },
  error: { color: colors.danger, marginTop: 10, fontSize: 13 },
  models: { flexDirection: "row", flexWrap: "wrap", gap: 8, marginTop: 8 },
  modelChip: { borderWidth: 1, borderColor: colors.border, borderRadius: 999, paddingHorizontal: 12, paddingVertical: 6 },
  modelChipActive: { backgroundColor: colors.accent, borderColor: colors.accent },
  modelText: { fontSize: 12, color: colors.panelAlt },
  modelTextActive: { color: colors.onAccent, fontWeight: "600" },
  empty: { color: colors.muted, marginTop: 8 },
  sessionRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingVertical: 12,
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: colors.border,
  },
  sessionRowDark: { borderBottomColor: colors.panelAlt },
  sessionText: { flex: 1, paddingRight: 12 },
  sessionTitle: { fontSize: 15, fontWeight: "600", color: colors.text },
  sessionMeta: { fontSize: 12, color: colors.muted, marginTop: 2 },
  textDark: { color: colors.onAccent },
  hintDark: { color: colors.muted },
  })
}
