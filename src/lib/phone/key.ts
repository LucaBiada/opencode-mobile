import * as SecureStore from "expo-secure-store"

// The Go key is a bearer credential: it belongs in the Keystore, never in
// AsyncStorage or the SQLite database.
const GO_API_KEY = "devmote_go_api_key"

export async function getGoApiKey(): Promise<string | null> {
  return SecureStore.getItemAsync(GO_API_KEY).catch(() => null)
}

export async function setGoApiKey(value: string): Promise<void> {
  const trimmed = value.trim()
  if (!trimmed) {
    await SecureStore.deleteItemAsync(GO_API_KEY)
    return
  }
  await SecureStore.setItemAsync(GO_API_KEY, trimmed)
}
