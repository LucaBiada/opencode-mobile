import assert from "node:assert/strict"
import { test } from "node:test"

import { globToRegExp, isWithin, normalizeRelative, PathEscapeError } from "./sandbox.ts"

test("normalizeRelative collapses dot segments", () => {
  assert.equal(normalizeRelative("./src//app/./x.ts"), "src/app/x.ts")
  assert.equal(normalizeRelative("src\\app\\x.ts"), "src/app/x.ts")
  assert.equal(normalizeRelative("."), "")
})

test("normalizeRelative rejects anything that leaves the workspace", () => {
  for (const bad of ["..", "../secrets", "src/../../etc", "/etc/passwd", "C:/Windows", "~/.ssh"]) {
    assert.throws(() => normalizeRelative(bad), PathEscapeError, bad)
  }
})

test("isWithin accepts the root and its children only", () => {
  assert.equal(isWithin("file:///data/app", "file:///data/app"), true)
  assert.equal(isWithin("file:///data/app", "file:///data/app/src/x"), true)
  assert.equal(isWithin("file:///data/app", "file:///data/application/x"), false)
  assert.equal(isWithin("file:///data/app", "file:///data/other/x"), false)
})

test("globToRegExp matches basenames when the pattern has no slash", () => {
  const re = globToRegExp("*.ts")
  assert.equal(re.test("x.ts"), true)
  assert.equal(re.test("src/x.ts"), true)
  assert.equal(re.test("x.tsx"), false)
})

test("globToRegExp keeps * inside one directory and lets ** cross", () => {
  assert.equal(globToRegExp("src/*.ts").test("src/a.ts"), true)
  assert.equal(globToRegExp("src/*.ts").test("src/deep/a.ts"), false)
  assert.equal(globToRegExp("src/**/*.ts").test("src/deep/a.ts"), true)
  assert.equal(globToRegExp("**/*.test.ts").test("a/b/c.test.ts"), true)
})

test("globToRegExp escapes regex metacharacters", () => {
  const re = globToRegExp("a+b(c).txt")
  assert.equal(re.test("a+b(c).txt"), true)
  assert.equal(re.test("aab(c).txt"), false)
})
