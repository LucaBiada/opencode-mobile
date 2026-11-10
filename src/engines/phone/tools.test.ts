import assert from "node:assert/strict"
import fs from "node:fs"
import path from "node:path"
import { test } from "node:test"

// Tripwire for the permission model: every tool that changes the workspace must
// call requestApproval before doing so. This reads the source rather than the
// runtime because the tools import expo-file-system, which node cannot load.
//
// If you add a mutating tool, add its requestApproval call and update this list.
const EXPECTED_GATED_TOOLS = ["edit", "write"]

test("only write and edit are gated, and both actually call the gate", () => {
  const source = fs.readFileSync(path.join(import.meta.dirname, "tools.ts"), "utf8")
  const gated = new Set([...source.matchAll(/requestApproval\(\s*"([^"]+)"/g)].map((match) => match[1]))

  assert.deepEqual(
    [...gated].sort(),
    EXPECTED_GATED_TOOLS,
    "Changing which tools ask for approval is a product decision: update EXPECTED_GATED_TOOLS.",
  )
})

test("the write tool gates before it writes, not after", () => {
  const source = fs.readFileSync(path.join(import.meta.dirname, "tools.ts"), "utf8")
  const writeBlock = source.slice(source.indexOf("write: tool("), source.indexOf("edit: tool("))
  const gateAt = writeBlock.indexOf("await requestApproval(")
  const writeAt = writeBlock.indexOf("writeText(")

  assert.ok(gateAt >= 0, "write must call requestApproval")
  assert.ok(writeAt > gateAt, "write must ask before touching the workspace")
})
