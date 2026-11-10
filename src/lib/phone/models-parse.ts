// Pure parsing for the Go model list, kept free of React Native imports so it
// can be tested with plain `node --test` (the same split the fork uses for
// api-detect and waitlist helpers).
export interface GoModel {
  id: string
  name: string
}

// The endpoint wraps its list differently across Go releases, so accept the
// shapes we have seen instead of pinning one: { data: [...] }, [...], or
// { models: [...] }. Entries may carry `id` or `slug` for the model id.
export function parseModels(payload: unknown): GoModel[] {
  const rows = Array.isArray(payload)
    ? payload
    : Array.isArray((payload as { data?: unknown })?.data)
      ? (payload as { data: unknown[] }).data
      : Array.isArray((payload as { models?: unknown })?.models)
        ? (payload as { models: unknown[] }).models
        : []

  const models: GoModel[] = []
  for (const row of rows) {
    if (!row || typeof row !== "object") continue
    const value = row as Record<string, unknown>
    const id = typeof value.id === "string" ? value.id : typeof value.slug === "string" ? value.slug : null
    if (!id) continue
    // Some OpenAI-compatible servers (Unsloth, LM Studio) list image models in
    // the same endpoint. They are useless for chat and confuse the picker.
    const task = typeof value.task === "string" ? value.task : null
    if (task && task !== "text-generation" && task !== "chat-completion") continue
    const name = typeof value.name === "string" && value.name ? value.name : id
    models.push({ id, name })
  }
  return models
}
