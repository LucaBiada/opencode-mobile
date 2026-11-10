import * as SecureStore from "expo-secure-store"

// Provider credentials are bearer tokens: they belong in the Keystore, never in
// AsyncStorage or the SQLite database. One key per provider id.
const PROVIDER_KEY_PREFIX = "devmote_provider_key_"

// Pre-provider installs stored the Go key under this name; read it as a fallback
// so an existing setup keeps working after the upgrade.
const LEGACY_GO_KEY = "devmote_go_api_key"

export async function getProviderKey(providerID: string): Promise<string | null> {
  const value = await SecureStore.getItemAsync(`${PROVIDER_KEY_PREFIX}${providerID}`).catch(() => null)
  if (value) return value
  if (providerID === "opencode-go") return SecureStore.getItemAsync(LEGACY_GO_KEY).catch(() => null)
  return null
}

export async function setProviderKey(providerID: string, value: string): Promise<void> {
  const trimmed = value.trim()
  if (!trimmed) {
    await SecureStore.deleteItemAsync(`${PROVIDER_KEY_PREFIX}${providerID}`)
    return
  }
  await SecureStore.setItemAsync(`${PROVIDER_KEY_PREFIX}${providerID}`, trimmed)
}
