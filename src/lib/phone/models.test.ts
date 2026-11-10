import assert from "node:assert/strict"
import { test } from "node:test"

import { parseModels } from "./models-parse.ts"

test("parseModels reads the { data: [...] } envelope", () => {
  const models = parseModels({
    data: [
      { id: "deepseek-v4.1-flash", name: "DeepSeek V4.1 Flash" },
      { id: "glm-5.3" },
    ],
  })
  assert.deepEqual(models, [
    { id: "deepseek-v4.1-flash", name: "DeepSeek V4.1 Flash" },
    { id: "glm-5.3", name: "glm-5.3" },
  ])
})

test("parseModels reads a bare array and falls back to slug for the id", () => {
  const models = parseModels([{ slug: "kimi-k3", name: "Kimi K3" }])
  assert.deepEqual(models, [{ id: "kimi-k3", name: "Kimi K3" }])
})

test("parseModels reads the { models: [...] } envelope", () => {
  const models = parseModels({ models: [{ id: "hy3" }] })
  assert.deepEqual(models, [{ id: "hy3", name: "hy3" }])
})

test("parseModels drops entries without an id", () => {
  const models = parseModels({ data: [{ name: "no id" }, null, "nope", { id: "ok" }] })
  assert.deepEqual(models, [{ id: "ok", name: "ok" }])
})

test("parseModels tolerates an unexpected payload", () => {
  assert.deepEqual(parseModels(null), [])
  assert.deepEqual(parseModels({ error: "nope" }), [])
})
