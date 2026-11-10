import { fetch as expoFetch } from "expo/fetch"
import AsyncStorage from "@react-native-async-storage/async-storage"

import { parseModels, type GoModel } from "./models-parse"
import type { Provider } from "./providers"

export type { GoModel }

// Go asks clients to identify themselves. Keep the version in the agent string;
// it is sent to every provider, which is harmless and useful in logs.
export const GO_USER_AGENT = "devmote/0.5.0"

const CACHE_TTL_MS = 24 * 60 * 60 * 1000

interface CachedModels {
  fetchedAt: number
  models: GoModel[]
}

function cacheKey(providerID: string): string {
  return `devmote_models_${providerID}`
}

export async function fetchProviderModels(provider: Provider, apiKey?: string | null): Promise<GoModel[]> {
  const headers: Record<string, string> = { "User-Agent": GO_USER_AGENT }
  if (apiKey) headers.Authorization = `Bearer ${apiKey}`

  const response = await expoFetch(provider.modelsURL, { headers })
  if (!response.ok) {
    const body = await response.text().catch(() => "")
    throw new Error(`models ${response.status}${body ? `: ${body.slice(0, 200)}` : ""}`)
  }
  const models = parseModels(await response.json())
  await AsyncStorage.setItem(cacheKey(provider.id), JSON.stringify({ fetchedAt: Date.now(), models } satisfies CachedModels))
  return models
}

export async function loadProviderModels(
  provider: Provider,
  apiKey: string | null | undefined,
  force = false,
): Promise<GoModel[]> {
  if (!force) {
    const cached = await AsyncStorage.getItem(cacheKey(provider.id))
    if (cached) {
      try {
        const parsed = JSON.parse(cached) as CachedModels
        if (Date.now() - parsed.fetchedAt < CACHE_TTL_MS && parsed.models.length > 0) return parsed.models
      } catch {
        // fall through to a network fetch
      }
    }
  }
  return fetchProviderModels(provider, apiKey)
}

export async function clearProviderModelsCache(providerID: string): Promise<void> {
  await AsyncStorage.removeItem(cacheKey(providerID))
}
