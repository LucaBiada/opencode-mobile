import { useCallback, useEffect, useMemo, useState } from "react"
import type { ComponentProps } from "react"
import { ScrollView, StyleSheet, Text, TouchableOpacity, View } from "react-native"
import { Ionicons } from "@expo/vector-icons"
import { useRouter } from "expo-router"
import { useTranslation } from "react-i18next"
import AsyncStorage from "@react-native-async-storage/async-storage"
import { useSafeAreaInsets } from "react-native-safe-area-context"

import { useTheme, type Theme } from "../src/theme"
import { useMode, type Mode } from "../src/stores/mode"
import { useConnections } from "../src/stores/connections"
import { getProviderKey } from "../src/lib/phone/key"
import { DEFAULT_PROVIDER_ID, PLACEHOLDER_HOST, PRESETS } from "../src/lib/phone/providers"
import { listProviders, seedProviders } from "../src/engines/phone/store"

const LAST_PROVIDER_KEY = "devmote_last_provider"

export default function HomeScreen() {
  const s = useStyles()
  const colors = useTheme()
  const router = useRouter()
  const insets = useSafeAreaInsets()
  const { t } = useTranslation()
  const setMode = useMode((state) => state.setMode)
  const activeConnection = useConnections((state) => state.activeConnection)

  const [goKey, setGoKey] = useState(false)
  const [localName, setLocalName] = useState<string | null>(null)

  useEffect(() => {
    getProviderKey(DEFAULT_PROVIDER_ID)
      .then((key) => setGoKey(Boolean(key)))
      .catch(() => setGoKey(false))
    // A local provider counts as configured once its URL stops being the
    // shipped placeholder — the key alone is not enough to reach it.
    seedProviders(PRESETS)
      .then(() => listProviders())
      .then((rows) => {
        const local = rows.find(
          (provider) => provider.id !== DEFAULT_PROVIDER_ID && !provider.baseURL.includes(PLACEHOLDER_HOST),
        )
        setLocalName(local?.name ?? null)
      })
      .catch(() => setLocalName(null))
  }, [])

  const pick = useCallback(
    (mode: Mode) => {
      void setMode(mode)
      router.replace("/(tabs)/sessions")
    },
    [router, setMode],
  )

  const configure = useCallback(
    (mode: Mode) => {
      void setMode(mode)
      router.replace("/(tabs)/provider")
    },
    [router, setMode],
  )


  return (
    <View style={[s.container, { paddingTop: insets.top + 12 }]}>
      <View style={s.header}>
        <Text style={s.brand}>Devmote</Text>
        <TouchableOpacity onPress={() => router.push("/settings")} hitSlop={10} testID="home-settings">
          <Ionicons name="settings-outline" size={22} color={colors.muted} />
        </TouchableOpacity>
      </View>

      <ScrollView contentContainerStyle={s.content}>
        <Text style={s.heading}>{t("home.heading")}</Text>
        <Text style={s.subheading}>{t("home.subheading")}</Text>

        <ModeCard
          icon="desktop-outline"
          title={t("home.remote.title")}
          subtitle={t("home.remote.subtitle")}
          status={
            activeConnection
              ? t("home.status.connected", { name: activeConnection.name })
              : t("home.status.noComputer")
          }
          statusTone={activeConnection ? "ok" : "muted"}
          onPress={() => pick("remote")}
          testID="mode-remote"
        />

        <ModeCard
          icon="cloud-outline"
          title={t("home.cloud.title")}
          subtitle={t("home.cloud.subtitle")}
          status={goKey ? t("home.status.goReady") : t("home.status.keyMissing")}
          statusTone={goKey ? "ok" : "warn"}
          onPress={() => pick("cloud")}
          onConfigure={() => configure("cloud")}
          configureLabel={t("home.configure")}
          testID="mode-cloud"
        />

        <ModeCard
          icon="wifi-outline"
          title={t("home.local.title")}
          subtitle={t("home.local.subtitle")}
          status={localName ? t("home.status.providerReady", { provider: localName }) : t("home.status.notConfigured")}
          statusTone={localName ? "ok" : "muted"}
          onPress={() => pick("local")}
          onConfigure={() => configure("local")}
          configureLabel={t("home.configure")}
          testID="mode-local"
        />
      </ScrollView>
    </View>
  )
}

function ModeCard({
  icon,
  title,
  subtitle,
  status,
  statusTone,
  onPress,
  onConfigure,
  configureLabel,
  testID,
}: {
  icon: ComponentProps<typeof Ionicons>["name"]
  title: string
  subtitle: string
  status: string
  statusTone: "ok" | "warn" | "muted"
  onPress: () => void
  onConfigure?: () => void
  configureLabel?: string
  testID: string
}) {
  const s = useStyles()
  const colors = useTheme()
  const tone = statusTone === "ok" ? colors.success : statusTone === "warn" ? colors.accent : colors.muted

  return (
    <TouchableOpacity style={s.card} onPress={onPress} activeOpacity={0.75} testID={testID}>
      <View style={s.cardIcon}>
        <Ionicons name={icon} size={22} color={colors.accent} />
      </View>
      <View style={s.cardBody}>
        <Text style={s.cardTitle}>{title}</Text>
        <Text style={s.cardSubtitle}>{subtitle}</Text>
        <Text style={[s.cardStatus, { color: tone }]}>{status}</Text>
      </View>
      <View style={s.cardRight}>
        <Ionicons name="chevron-forward" size={18} color={colors.muted} />
      </View>
      {onConfigure ? (
        <TouchableOpacity
          style={s.configure}
          onPress={onConfigure}
          hitSlop={8}
          testID={`${testID}-configure`}
        >
          <Text style={s.configureText}>{configureLabel}</Text>
        </TouchableOpacity>
      ) : null}
    </TouchableOpacity>
  )
}

function useStyles() {
  const colors = useTheme()
  return useMemo(() => createStyles(colors), [colors])
}

function createStyles(colors: Theme) {
  return StyleSheet.create({
    container: { flex: 1, backgroundColor: colors.bg },
    header: {
      flexDirection: "row",
      alignItems: "center",
      justifyContent: "space-between",
      paddingHorizontal: 20,
      paddingBottom: 8,
    },
    brand: { color: colors.text, fontSize: 15, fontWeight: "700", letterSpacing: 0.2 },
    content: { paddingHorizontal: 16, paddingTop: 28, paddingBottom: 40 },
    heading: { color: colors.text, fontSize: 30, fontWeight: "700", paddingHorizontal: 4 },
    subheading: {
      color: colors.muted,
      fontSize: 15,
      lineHeight: 21,
      marginTop: 8,
      marginBottom: 24,
      paddingHorizontal: 4,
    },
    card: {
      flexDirection: "row",
      alignItems: "center",
      gap: 14,
      padding: 16,
      marginBottom: 12,
      borderRadius: 18,
      borderWidth: 1,
      borderColor: colors.border,
      backgroundColor: colors.panel,
    },
    cardIcon: {
      width: 44,
      height: 44,
      borderRadius: 22,
      backgroundColor: colors.accentSoft,
      alignItems: "center",
      justifyContent: "center",
    },
    cardBody: { flex: 1 },
    cardTitle: { color: colors.text, fontSize: 17, fontWeight: "600" },
    cardSubtitle: { color: colors.muted, fontSize: 13, marginTop: 2, lineHeight: 18 },
    cardStatus: { fontSize: 12, marginTop: 6, fontWeight: "600" },
    cardRight: { justifyContent: "center" },
    configure: { paddingVertical: 4, paddingLeft: 8 },
    configureText: { color: colors.accent, fontSize: 12, fontWeight: "600" },
  })
}
