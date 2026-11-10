// Go exposes one base URL per request format and translates between them. Most
// models speak chat-completions; these are the documented exceptions. Kept free
// of React Native imports so the routing table can be unit-tested.
export type GoRequestFormat = "anthropic" | "responses" | "google" | "chat"

const ANTHROPIC_MODELS = new Set(["claude-haiku-5-5", "qwen3.8-max", "qwen3.8-flash", "qwen3.7-plus", "minimax-m3"])
const RESPONSES_MODELS = new Set([
  "grok-4.7",
  "gpt-6-luna",
  "gpt-5.6-luna",
  "muse-spark-1.3-contributor",
  "muse-spark-1.2-contributor",
])
const GOOGLE_MODELS = new Set(["gemini-4-argon"])

export function goRequestFormat(modelID: string): GoRequestFormat {
  if (ANTHROPIC_MODELS.has(modelID)) return "anthropic"
  if (RESPONSES_MODELS.has(modelID)) return "responses"
  if (GOOGLE_MODELS.has(modelID)) return "google"
  return "chat"
}
