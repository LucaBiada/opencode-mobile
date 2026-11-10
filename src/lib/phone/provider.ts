import { type LanguageModel } from "ai"
import { createAnthropic } from "@ai-sdk/anthropic"
import { createGoogleGenerativeAI } from "@ai-sdk/google"
import { createOpenAI } from "@ai-sdk/openai"
import { createOpenAICompatible, type OpenAICompatibleProviderSettings } from "@ai-sdk/openai-compatible"
import { fetch as expoFetch } from "expo/fetch"

import { GO_USER_AGENT } from "./models"
import { goRequestFormat } from "./provider-format"

// expo/fetch is the WinterCG-compliant fetch that supports streaming on React
// Native; the global fetch historically did not, which is why this cast exists.
const fetchImpl = expoFetch as unknown as NonNullable<OpenAICompatibleProviderSettings["fetch"]>

// Go exposes one base URL per request format and translates between them.
const ANTHROPIC_V1 = "https://opencode.ai/inference/go/anthropic/v1"
const OPENAI_V1 = "https://opencode.ai/inference/go/openai/v1"
const GOOGLE_V1BETA = "https://opencode.ai/inference/go/google/v1beta"

function common(opts: { apiKey: string; sessionID: string }) {
  return {
    apiKey: opts.apiKey,
    headers: {
      "User-Agent": GO_USER_AGENT,
      // Stable per conversation so Go can route and reuse prompt caches.
      "x-opencode-session": opts.sessionID,
    },
    fetch: fetchImpl,
  }
}

export function phoneChatModel(opts: { apiKey: string; modelID: string; sessionID: string }): LanguageModel {
  const shared = common(opts)

  switch (goRequestFormat(opts.modelID)) {
    case "anthropic": {
      const provider = createAnthropic({ baseURL: ANTHROPIC_V1, ...shared })
      return provider(opts.modelID)
    }
    case "responses": {
      const provider = createOpenAI({ baseURL: OPENAI_V1, ...shared })
      return provider(opts.modelID)
    }
    case "google": {
      const provider = createGoogleGenerativeAI({ baseURL: GOOGLE_V1BETA, ...shared })
      return provider(opts.modelID)
    }
    default: {
      const provider = createOpenAICompatible({
        name: "opencode-go",
        baseURL: OPENAI_V1,
        includeUsage: true,
        ...shared,
      })
      return provider.chatModel(opts.modelID)
    }
  }
}
