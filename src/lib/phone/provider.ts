import { createOpenAICompatible, type OpenAICompatibleProviderSettings } from "@ai-sdk/openai-compatible"
import { fetch as expoFetch } from "expo/fetch"

import { GO_BASE_URL, GO_USER_AGENT } from "./models"

// expo/fetch is the WinterCG-compliant fetch that supports streaming on React
// Native; the global fetch historically did not, which is why this cast exists.
const fetchImpl = expoFetch as unknown as NonNullable<OpenAICompatibleProviderSettings["fetch"]>

export function phoneChatModel(opts: { apiKey: string; modelID: string; sessionID: string }) {
  const provider = createOpenAICompatible({
    name: "opencode-go",
    baseURL: GO_BASE_URL,
    apiKey: opts.apiKey,
    headers: {
      "User-Agent": GO_USER_AGENT,
      // Stable per conversation so Go can route and reuse prompt caches.
      "x-opencode-session": opts.sessionID,
    },
    fetch: fetchImpl,
    includeUsage: true,
  })
  return provider.chatModel(opts.modelID)
}
