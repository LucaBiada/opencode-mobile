import { fetch as expoFetch } from "expo/fetch"
import AsyncStorage from "@react-native-async-storage/async-storage"

import { parseModels, type GoModel } from "./models-parse"

export type { GoModel }

// OpenCode Go is reached through per-API base URLs, not one shared prefix.
// We only use the OpenAI chat-completions one for now: most Go models speak it,
// and the remaining adapters can be added behind the same shape later.
export const GO_BASE_URL = "https://opencode.ai/inference/go/openai/v1"
export const GO_MODELS_URL = "https://opencode.ai/inference/go/v1/models"

// Go asks clients to identify themselves and to send a stable session id so it
// can route and cache prompts. Keep the version in the agent string.
export const GO_USER_AGENT = "devmote/0.5.0"

const CACHE_KEY = "devmote_go_models"
const CACHE_TTL_MS = 24 * 60 * 60 * 1000

interface CachedModels {
  fetchedAt: number
  models: GoModel[]
}

export async function fetchGoModels(apiKey: string): Promise<GoModel[]> {
  const response = await expoFetch(GO_MODELS_URL, {
    headers: {
      Authorization: `Bearer ${apiKey}`,
      "User-Agent": GO_USER_AGENT,
    },
  })
  if (!response.ok) {
    const body = await response.text().catch(() => "")
    throw new Error(`models ${response.status}${body ? `: ${body.slice(0, 200)}` : ""}`)
  }
  const models = parseModels(await response.json())
  await AsyncStorage.setItem(CACHE_KEY, JSON.stringify({ fetchedAt: Date.now(), models } satisfies CachedModels))
  return models
}

export async function loadGoModels(apiKey: string, force = false): Promise<GoModel[]> {
  if (!force) {
    const cached = await AsyncStorage.getItem(CACHE_KEY)
    if (cached) {
      try {
        const parsed = JSON.parse(cached) as CachedModels
        if (Date.now() - parsed.fetchedAt < CACHE_TTL_MS && parsed.models.length > 0) return parsed.models
      } catch {
        // fall through to a network fetch
      }
    }
  }
  return fetchGoModels(apiKey)
}

export async function clearGoModelsCache(): Promise<void> {
  await AsyncStorage.removeItem(CACHE_KEY)
}
