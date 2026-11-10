import assert from "node:assert/strict"
import { test } from "node:test"

import { CUSTOM_PROVIDER, DEFAULT_PROVIDER_ID, PLACEHOLDER_HOST, PRESETS, modelsURLFor, providerProblem } from "./providers.ts"

test("every preset has a usable shape and a unique id", () => {
  const ids = new Set<string>()
  for (const preset of [...PRESETS, CUSTOM_PROVIDER]) {
    assert.ok(preset.id, "id")
    assert.ok(preset.name, "name")
    assert.match(preset.baseURL, /^https?:\/\//)
    assert.ok(preset.modelsURL.endsWith("/models"), preset.id)
    ids.add(preset.id)
  }
  assert.equal(ids.size, PRESETS.length + 1)
})

test("the default provider is OpenCode Go", () => {
  assert.equal(DEFAULT_PROVIDER_ID, "opencode-go")
  assert.ok(PRESETS.some((preset) => preset.id === DEFAULT_PROVIDER_ID))
})

test("modelsURLFor trims trailing slashes", () => {
  assert.equal(modelsURLFor("http://host:11434/v1/"), "http://host:11434/v1/models")
  assert.equal(modelsURLFor("https://api.example.com/v1"), "https://api.example.com/v1/models")
})

test("providerProblem catches the placeholder host and bad schemes", () => {
  assert.match(providerProblem({ ...PRESETS[1] }) ?? "", /LAN address/)
  assert.match(
    providerProblem({ ...PRESETS[1], baseURL: `http://${PLACEHOLDER_HOST}:11434/v1` }) ?? "",
    /LAN address/,
  )
  assert.match(providerProblem({ ...PRESETS[1], baseURL: "host:11434/v1" }) ?? "", /http/)
  assert.equal(providerProblem({ ...PRESETS[1], baseURL: "http://192.168.1.9:11434/v1" }), null)
})
