import { useState, useCallback, useMemo, useRef } from "react"
import { View, Text, TouchableOpacity, StyleSheet } from "react-native"
import { Ionicons } from "@expo/vector-icons"
import BottomSheet, { BottomSheetBackdrop, BottomSheetSectionList, BottomSheetTextInput } from "@gorhom/bottom-sheet"
import { useTranslation } from "react-i18next"
import { useTheme, type Theme } from "../../theme"

interface ModelItem {
  providerID: string
  providerName: string
  modelID: string
  modelName: string
}

interface Provider {
  id: string
  name: string
  models: Array<{ id: string; name: string }>
}

interface Props {
  providers: Provider[]
  selected: { providerID: string; modelID: string } | null
  isDark: boolean
  onSelect: (providerID: string, modelID: string) => void
  sheetRef: React.RefObject<BottomSheet | null>
}

function useThemedStyles() {
  const colors = useTheme()
  return useMemo(() => createStyles(colors), [colors])
}

export function ModelPicker({ providers, selected, isDark, onSelect, sheetRef }: Props) {
  const s = useThemedStyles()
  const colors = useTheme()
  const { t } = useTranslation()
  const [search, setSearch] = useState("")

  const sections = useMemo(() => {
    const list = Array.isArray(providers) ? providers : []
    const q = search.toLowerCase()
    const result = list
      .map((p) => {
        const models = (p.models || [])
          .filter(
            (m) =>
              !q ||
              m.id.toLowerCase().includes(q) ||
              m.name.toLowerCase().includes(q) ||
              p.name.toLowerCase().includes(q),
          )
          .map((m) => ({
            providerID: p.id,
            providerName: p.name || p.id,
            modelID: m.id,
            modelName: m.name || m.id,
          }))
        // Sort selected model to top within its group
        if (selected) {
          models.sort((a, b) => {
            const aActive = a.providerID === selected.providerID && a.modelID === selected.modelID
            const bActive = b.providerID === selected.providerID && b.modelID === selected.modelID
            return aActive === bActive ? 0 : aActive ? -1 : 1
          })
        }
        return { title: p.name || p.id, data: models }
      })
      .filter((s) => s.data.length > 0)
    // Sort the section containing the selected model to the top
    if (selected) {
      result.sort((a, b) => {
        const aHas = a.data.some((m) => m.providerID === selected.providerID && m.modelID === selected.modelID)
        const bHas = b.data.some((m) => m.providerID === selected.providerID && m.modelID === selected.modelID)
        return aHas === bHas ? 0 : aHas ? -1 : 1
      })
    }
    return result
  }, [providers, search, selected])

  const handleSelect = useCallback(
    (providerID: string, modelID: string) => {
      onSelect(providerID, modelID)
      setSearch("")
      sheetRef.current?.close()
    },
    [onSelect, sheetRef],
  )

  return (
    <BottomSheet
      ref={sheetRef}
      index={-1}
      snapPoints={["50%", "80%"]}
      // See DirectoryBrowserSheet.tsx for why this is required alongside
      // static snapPoints (issue #104): without it the sheet can never open.
      enableDynamicSizing={false}
      enablePanDownToClose
      keyboardBehavior="interactive"
      keyboardBlurBehavior="restore"
      android_keyboardInputMode="adjustResize"
      backgroundStyle={isDark ? s.sheetDark : s.sheet}
      handleIndicatorStyle={{ backgroundColor: colors.muted }}
      backdropComponent={(props) => (
        <BottomSheetBackdrop {...props} disappearsOnIndex={-1} appearsOnIndex={0} opacity={0.5} />
      )}
      onChange={(idx) => {
        if (idx === -1) setSearch("")
      }}
    >
      <View style={s.header}>
        <Text style={[s.title, isDark && s.textWhite]}>{t("chat.modelPicker.title")}</Text>
        <BottomSheetTextInput
          style={[s.search, isDark && s.searchDark]}
          placeholder={t("chat.modelPicker.searchPlaceholder")}
          placeholderTextColor={colors.muted}
          value={search}
          onChangeText={setSearch}
          autoCorrect={false}
          autoCapitalize="none"
        />
      </View>
      <BottomSheetSectionList
        sections={sections}
        keyExtractor={(item: ModelItem) => `${item.providerID}/${item.modelID}`}
        renderSectionHeader={({ section }: { section: { title: string } }) => (
          <View style={[s.sectionHeader, isDark && s.sectionHeaderDark]}>
            <Text style={[s.sectionTitle, isDark && s.metaDark]}>{section.title}</Text>
          </View>
        )}
        renderItem={({ item }: { item: ModelItem }) => {
          const active = selected?.providerID === item.providerID && selected?.modelID === item.modelID
          return (
            <TouchableOpacity
              style={[s.row, isDark && s.rowDark, active && (isDark ? s.rowSelectedDark : s.rowSelected)]}
              onPress={() => handleSelect(item.providerID, item.modelID)}
              testID={`model-option-${item.providerID}-${item.modelID}`}
            >
              <View style={s.rowText}>
                <Text style={[s.rowName, isDark && s.textWhite]} numberOfLines={1}>
                  {item.modelName || item.modelID}
                </Text>
                <Text style={[s.rowProvider, isDark && s.metaDark]}>{item.providerName || item.providerID}</Text>
              </View>
              {active && <Ionicons name="checkmark-circle" size={20} color={colors.accent} />}
            </TouchableOpacity>
          )
        }}
        contentContainerStyle={s.content}
        stickySectionHeadersEnabled
      />
    </BottomSheet>
  )
}

function createStyles(colors: Theme) {
  return StyleSheet.create({
  sheet: { backgroundColor: colors.panel },
  sheetDark: { backgroundColor: colors.panel },
  header: { paddingHorizontal: 16, paddingBottom: 12, gap: 10 },
  title: { fontSize: 18, fontWeight: "700", color: colors.text },
  textWhite: { color: colors.onAccent },
  search: {
    backgroundColor: colors.panelAlt,
    borderRadius: 10,
    paddingHorizontal: 14,
    paddingVertical: 10,
    fontSize: 15,
    color: colors.text,
  },
  searchDark: { backgroundColor: colors.panelAlt, color: colors.onAccent },
  content: { paddingBottom: 40 },
  sectionHeader: {
    backgroundColor: colors.panelAlt,
    paddingHorizontal: 16,
    paddingVertical: 8,
  },
  sectionHeaderDark: { backgroundColor: colors.bg },
  sectionTitle: {
    fontSize: 12,
    fontWeight: "700",
    color: colors.muted,
    textTransform: "uppercase",
    letterSpacing: 0.5,
  },
  metaDark: { color: colors.muted },
  row: {
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: colors.border,
  },
  rowDark: { borderBottomColor: colors.border },
  rowSelected: { backgroundColor: colors.accentSoft },
  rowSelectedDark: { backgroundColor: colors.accentSoft },
  rowText: { flex: 1 },
  rowName: { fontSize: 15, fontWeight: "500", color: colors.text },
  rowProvider: { fontSize: 12, color: colors.muted, marginTop: 1 },
  })
}
