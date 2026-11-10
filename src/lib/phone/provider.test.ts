import assert from "node:assert/strict"
import { test } from "node:test"

import { goRequestFormat } from "./provider-format.ts"

// This list mirrors Go's documented per-model endpoints. If a model changes
// format, this test should fail loudly instead of the request 404ing at runtime.
const ANTHROPIC = ["claude-haiku-5-5", "qwen3.8-max", "qwen3.8-flash", "qwen3.7-plus", "minimax-m3"]
const RESPONSES = ["grok-4.7", "gpt-6-luna", "gpt-5.6-luna", "muse-spark-1.3-contributor", "muse-spark-1.2-contributor"]
const GOOGLE = ["gemini-4-argon"]

test("known non-chat models are routed to their native format", () => {
  for (const id of ANTHROPIC) assert.equal(goRequestFormat(id), "anthropic", id)
  for (const id of RESPONSES) assert.equal(goRequestFormat(id), "responses", id)
  for (const id of GOOGLE) assert.equal(goRequestFormat(id), "google", id)
})

test("everything else falls back to chat-completions", () => {
  for (const id of ["deepseek-v4.1-flash", "glm-5.3", "kimi-k3", "hy3", "beam-free"]) {
    assert.equal(goRequestFormat(id), "chat", id)
  }
})
