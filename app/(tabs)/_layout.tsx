import { Tabs, useRouter } from "expo-router"
import { Ionicons } from "@expo/vector-icons"
import { TouchableOpacity } from "react-native"
import { useTranslation } from "react-i18next"

import { useTheme } from "../../src/theme"
import { useMode } from "../../src/stores/mode"

export default function TabLayout() {
  const colors = useTheme()
  const router = useRouter()
  const { t } = useTranslation()
  const mode = useMode((state) => state.mode)
  const isRemote = mode === "remote"

  // The sessions tab shows which workspace you are in, and its left action goes
  // back to Home so switching mode is one tap from anywhere.
  const modeTitle =
    mode === "remote"
      ? t("home.remote.title")
      : mode === "cloud"
        ? t("home.cloud.title")
        : t("home.local.title")

  return (
    <Tabs
      screenOptions={{
        tabBarActiveTintColor: colors.text,
        tabBarInactiveTintColor: colors.muted,
        tabBarStyle: {
          backgroundColor: colors.bg,
          borderTopColor: colors.border,
        },
        headerStyle: {
          backgroundColor: colors.bg,
        },
        headerShadowVisible: false,
        headerTintColor: colors.text,
      }}
    >
      <Tabs.Screen
        name="sessions"
        options={{
          title: modeTitle,
          tabBarLabel: t("nav.sessionsTab"),
          headerLeft: () => (
            <TouchableOpacity
              onPress={() => router.replace("/")}
              hitSlop={10}
              style={{ paddingHorizontal: 14 }}
              testID="sessions-home"
            >
              <Ionicons name="home-outline" size={20} color={colors.muted} />
            </TouchableOpacity>
          ),
          tabBarIcon: ({ color, size }) => <Ionicons name="chatbubbles-outline" size={size} color={color} />,
        }}
      />
      <Tabs.Screen
        name="connections"
        options={{
          href: isRemote ? undefined : null,
          title: t("nav.connectionsTab"),
          tabBarIcon: ({ color, size }) => <Ionicons name="server-outline" size={size} color={color} />,
        }}
      />
      <Tabs.Screen
        name="provider"
        options={{
          href: isRemote ? null : undefined,
          title: t("nav.providerTab"),
          tabBarIcon: ({ color, size }) => <Ionicons name="cloud-outline" size={size} color={color} />,
        }}
      />
      <Tabs.Screen
        name="settings"
        options={{
          title: t("nav.settingsTab"),
          tabBarIcon: ({ color, size }) => <Ionicons name="settings-outline" size={size} color={color} />,
        }}
      />
    </Tabs>
  )
}
