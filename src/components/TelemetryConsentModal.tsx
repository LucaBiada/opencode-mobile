/**
 * First-launch consent modal for crash reporting AND activation analytics.
 *
 * A single "Allow" decision gates both Sentry (crash reports) and PostHog
 * (anonymous usage analytics) — see src/lib/telemetry.ts. There is no
 * separate toggle for analytics, so this modal must disclose both.
 *
 * Shows once when the user hasn't yet made a consent decision.
 * Matches the app's existing Settings screen visual conventions.
 */

import { useMemo } from "react"
import { View, Text, TouchableOpacity, StyleSheet, useColorScheme, Modal, Linking } from "react-native"
import { Ionicons } from "@expo/vector-icons"
import { useTranslation } from "react-i18next"
import { useTheme, type Theme } from "../theme"
import { PRIVACY_POLICY_URL } from "../lib/links"

interface Props {
  visible: boolean
  onAllow: () => void
  onDecline: () => void
}

function useThemedStyles() {
  const colors = useTheme()
  return useMemo(() => createStyles(colors), [colors])
}

export function TelemetryConsentModal({ visible, onAllow, onDecline }: Props) {
  const styles = useThemedStyles()
  const colors = useTheme()
  const colorScheme = useColorScheme()
  const isDark = colorScheme === "dark"
  const { t } = useTranslation()

  return (
    <Modal visible={visible} transparent animationType="fade" statusBarTranslucent onRequestClose={onDecline}>
      <View style={styles.overlay}>
        <View style={[styles.card, isDark && styles.cardDark]} testID="telemetry-consent-card">
          {/* Icon */}
          <View style={[styles.iconWrap, isDark && styles.iconWrapDark]}>
            <Ionicons name="bug-outline" size={40} color={colors.accent} />
          </View>

          {/* Title */}
          <Text style={[styles.title, isDark && styles.textDark]}>{t("telemetryConsent.title")}</Text>

          {/* Body */}
          <Text style={[styles.body, isDark && styles.bodyDark]}>{t("telemetryConsent.body")}</Text>

          {/* Detail bullets */}
          <View style={styles.bullets}>
            <BulletRow icon="checkmark-circle" text={t("telemetryConsent.bullets.deviceInfo")} isDark={isDark} positive />
            <BulletRow
              icon="checkmark-circle"
              text={t("telemetryConsent.bullets.stackTraces")}
              isDark={isDark}
              positive
            />
            <BulletRow
              icon="checkmark-circle"
              text={t("telemetryConsent.bullets.usageEvents")}
              isDark={isDark}
              positive
            />
            <BulletRow
              icon="close-circle"
              text={t("telemetryConsent.bullets.noCode")}
              isDark={isDark}
              positive={false}
            />
            <BulletRow
              icon="close-circle"
              text={t("telemetryConsent.bullets.noServerUrls")}
              isDark={isDark}
              positive={false}
            />
          </View>

          {/* Privacy policy link */}
          <TouchableOpacity onPress={() => Linking.openURL(PRIVACY_POLICY_URL)}>
            <Text style={styles.privacyLink}>{t("telemetryConsent.privacyLink")}</Text>
          </TouchableOpacity>

          {/* Actions */}
          <View style={styles.actions}>
            <TouchableOpacity
              style={[styles.btn, styles.btnDecline, isDark && styles.btnDeclineDark]}
              onPress={onDecline}
              accessibilityLabel={t("telemetryConsent.declineA11yLabel")}
              testID="telemetry-decline-button"
            >
              <Text style={[styles.btnDeclineText, isDark && styles.btnDeclineTextDark]}>
                {t("telemetryConsent.declineButton")}
              </Text>
            </TouchableOpacity>
            <TouchableOpacity
              style={[styles.btn, styles.btnAllow]}
              onPress={onAllow}
              accessibilityLabel={t("telemetryConsent.allowA11yLabel")}
              testID="telemetry-allow-button"
            >
              <Text style={styles.btnAllowText}>{t("telemetryConsent.allowButton")}</Text>
            </TouchableOpacity>
          </View>

          <Text style={[styles.footnote, isDark && styles.footnoteDark]}>{t("telemetryConsent.footnote")}</Text>
        </View>
      </View>
    </Modal>
  )
}

function BulletRow({
  icon,
  text,
  isDark,
  positive,
}: {
  icon: "checkmark-circle" | "close-circle"
  text: string
  isDark: boolean
  positive: boolean
}) {
  const styles = useThemedStyles()
  const colors = useTheme()
  return (
    <View style={styles.bulletRow}>
      <Ionicons
        name={icon}
        size={18}
        color={positive ? colors.success : colors.danger}
        style={styles.bulletIcon}
      />
      <Text style={[styles.bulletText, isDark && styles.bodyDark]}>{text}</Text>
    </View>
  )
}

function createStyles(colors: Theme) {
  return StyleSheet.create({
  overlay: {
    flex: 1,
    backgroundColor: "rgba(0,0,0,0.6)",
    justifyContent: "center",
    alignItems: "center",
    padding: 24,
  },
  card: {
    backgroundColor: colors.panel,
    borderRadius: 20,
    padding: 28,
    width: "100%",
    maxWidth: 440,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.24,
    shadowRadius: 16,
    elevation: 10,
  },
  cardDark: {
    backgroundColor: colors.panelAlt,
  },
  iconWrap: {
    width: 72,
    height: 72,
    borderRadius: 18,
    backgroundColor: colors.accentSoft,
    justifyContent: "center",
    alignItems: "center",
    alignSelf: "center",
    marginBottom: 16,
  },
  iconWrapDark: {
    backgroundColor: colors.accentSoft,
  },
  title: {
    fontSize: 22,
    fontWeight: "700",
    color: colors.text,
    textAlign: "center",
    marginBottom: 12,
  },
  textDark: {
    color: colors.text,
  },
  body: {
    fontSize: 15,
    color: colors.textDim,
    textAlign: "center",
    lineHeight: 22,
    marginBottom: 20,
  },
  bodyDark: {
    color: colors.muted,
  },
  bullets: {
    marginBottom: 16,
  },
  bulletRow: {
    flexDirection: "row",
    alignItems: "flex-start",
    marginBottom: 8,
  },
  bulletIcon: {
    marginTop: 2,
    marginRight: 10,
    flexShrink: 0,
  },
  bulletText: {
    fontSize: 14,
    color: colors.textDim,
    flex: 1,
    lineHeight: 20,
  },
  privacyLink: {
    color: colors.accent,
    fontSize: 14,
    textAlign: "center",
    marginBottom: 24,
    textDecorationLine: "underline",
  },
  actions: {
    flexDirection: "row",
    gap: 12,
    marginBottom: 16,
  },
  btn: {
    flex: 1,
    paddingVertical: 14,
    borderRadius: 12,
    alignItems: "center",
    justifyContent: "center",
  },
  btnDecline: {
    backgroundColor: colors.panelAlt,
  },
  btnDeclineDark: {
    backgroundColor: colors.panel,
  },
  btnDeclineText: {
    color: colors.textDim,
    fontWeight: "600",
    fontSize: 16,
  },
  btnDeclineTextDark: {
    color: colors.muted,
  },
  btnAllow: {
    backgroundColor: colors.accent,
  },
  btnAllowText: {
    color: colors.text,
    fontWeight: "700",
    fontSize: 16,
  },
  footnote: {
    fontSize: 12,
    color: colors.muted,
    textAlign: "center",
  },
  footnoteDark: {
    color: colors.muted,
  },
  })
}
