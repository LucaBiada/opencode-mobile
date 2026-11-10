import { type LanguageModel } from "ai"
import { createAnthropic } from "@ai-sdk/anthropic"
import { createGoogleGenerativeAI } from "@ai-sdk/google"
import { createOpenAI } from "@ai-sdk/openai"
import { createOpenAICompatible, type OpenAICompatibleProviderSettings } from "@ai-sdk/openai-compatible"
import { fetch as expoFetch } from "expo/fetch"

import { GO_USER_AGENT } from "./models"
import { goRequestFormat } from "./provider-format"
import type { Provider } from "./providers"

// expo/fetch is the WinterCG-compliant fetch that supports streaming on React
// Native; the global fetch historically did not, which is why this cast exists.
const fetchImpl = expoFetch as unknown as NonNullable<OpenAICompatibleProviderSettings["fetch"]>

// Go serves several request shapes behind one key; every other provider is one
// shape, described by its Provider record.
const GO_ANTHROPIC_V1 = "https://opencode.ai/inference/go/anthropic/v1"
const GO_OPENAI_V1 = "https://opencode.ai/inference/go/openai/v1"
const GO_GOOGLE_V1BETA = "https://opencode.ai/inference/go/google/v1beta"

export interface ResolveModelOptions {
  provider: Provider
  modelID: string
  sessionID: string
  apiKey?: string | null
}

function headersFor(provider: Provider, sessionID: string): Record<string, string> {
  const headers: Record<string, string> = { "User-Agent": GO_USER_AGENT }
  // Only Go documents this header; sending it elsewhere is pointless noise.
  if (provider.format === "opencode-go") headers["x-opencode-session"] = sessionID
  return headers
}

export function providerModel({ provider, modelID, sessionID, apiKey }: ResolveModelOptions): LanguageModel {
  const apiKeyValue = apiKey ?? undefined
  const headers = headersFor(provider, sessionID)

  if (provider.format === "opencode-go") {
    switch (goRequestFormat(modelID)) {
      case "anthropic":
        return createAnthropic({ baseURL: GO_ANTHROPIC_V1, apiKey: apiKeyValue, headers, fetch: fetchImpl })(modelID)
      case "responses":
        return createOpenAI({ baseURL: GO_OPENAI_V1, apiKey: apiKeyValue, headers, fetch: fetchImpl })(modelID)
      case "google":
        return createGoogleGenerativeAI({ baseURL: GO_GOOGLE_V1BETA, apiKey: apiKeyValue, headers, fetch: fetchImpl })(
          modelID,
        )
      default:
        return createOpenAICompatible({
          name: provider.id,
          baseURL: GO_OPENAI_V1,
          apiKey: apiKeyValue,
          headers,
          fetch: fetchImpl,
          includeUsage: true,
        }).chatModel(modelID)
    }
  }

  switch (provider.format) {
    case "openai-responses":
      return createOpenAI({
        baseURL: provider.baseURL,
        apiKey: apiKeyValue,
        headers,
        fetch: fetchImpl,
      })(modelID)
    case "anthropic":
      return createAnthropic({ baseURL: provider.baseURL, apiKey: apiKeyValue, headers, fetch: fetchImpl })(modelID)
    case "google":
      return createGoogleGenerativeAI({
        baseURL: provider.baseURL,
        apiKey: apiKeyValue,
        headers,
        fetch: fetchImpl,
      })(modelID)
    default:
      // Ollama, LM Studio, Unsloth, llama.cpp, vLLM and the long tail of
      // OpenAI-compatible servers all land here.
      return createOpenAICompatible({
        name: provider.id,
        baseURL: provider.baseURL,
        apiKey: apiKeyValue,
        headers,
        fetch: fetchImpl,
        includeUsage: true,
      }).chatModel(modelID)
  }
}
