import { test } from "node:test"
import assert from "node:assert/strict"
import { readFileSync } from "node:fs"
import { fileURLToPath } from "node:url"
import path from "node:path"

// Same approach as wide-content-scroll.regression.test.ts: this repo's test
// runtime is node:test with no React Native renderer, so assert on the real
// component source instead of skipping component-level coverage.
//
// The reported regression: dragging sideways inside a code block selected the
// message instead of scrolling it, and holding a message popped a menu. Both
// came from the bubble being a touchable. Message actions are now plain buttons
// in the row under the message and the bubble itself has no press handling.

const here = path.dirname(fileURLToPath(import.meta.url))
const read = (rel: string) => readFileSync(path.join(here, rel), "utf8")

test("the bubble has no press or long-press of its own", () => {
  const src = read("chat/MessageBubble.tsx")
  assert.match(src, /<View style=\{isUser \? styles\.userRow : styles\.assistant\}/)
  assert.doesNotMatch(src, /onLongPress/, "holding a message must not pop anything")
  assert.doesNotMatch(src, /activeOpacity/, "the bubble is not a touchable")
  assert.doesNotMatch(
    src,
    /<TouchableOpacity\s+[^>]*styles\.(userBubble|assistant)/,
    "the bubble must be a plain View",
  )
  assert.doesNotMatch(src, /onPress=\{onLongPress|handleMessageLongPress/, "no long-press handler left")
})

test("actions are buttons under the message, and handlers are wired", () => {
  const src = read("chat/MessageBubble.tsx")
  assert.match(src, /onSelectText\?: \(messageID: string\) => void/)
  assert.match(src, /onEdit\?: \(messageID: string\) => void/)
  assert.match(src, /\{onSelectText && hasSelectableContent\(parts\) && \(/)
  assert.match(src, /\{isUser && onEdit && /)
  assert.match(src, /testID=\{`message-select-text-\$\{message\.id\}`\}/)
  assert.match(src, /testID=\{`message-edit-\$\{message\.id\}`\}/)
  assert.match(src, /onPress=\{\(\) => onSelectText\(message\.id\)\}/)
  assert.match(src, /onPress=\{\(\) => onEdit\(message\.id\)\}/)

  // The direct-copy and share actions live next to select-text; the token count
  // is pushed to the right edge so the buttons stay left-aligned as one group.
  assert.match(src, /testID=\{`message-copy-\$\{message\.id\}`\}/)
  assert.match(src, /Share\.share\(\{ message: text \}\)/)
  const footer = src.slice(src.indexOf("footer: {"), src.indexOf("tokens: {"))
  assert.ok(footer.includes('flexDirection: "row"'), "actions sit in one row")
  assert.ok(
    src.slice(src.indexOf("tokens: {"), src.indexOf("userActions: {")).includes('marginLeft: "auto"'),
    "the token count is pushed to the right edge",
  )
})

test("message text is not inline-selectable on Android", () => {
  const src = read("chat/MessageBubble.tsx")
  assert.match(src, /selectable=\{Platform\.OS === "ios"\}/)
  // No always-on selectable anywhere in the bubble body.
  const code = src
    .split("\n")
    .filter((line) => !line.trim().startsWith("//"))
    .join("\n")
    .replace(/\{\/\*[\s\S]*?\*\/\}/g, "") // JSX block comments mention selection
    .replaceAll('selectable={Platform.OS === "ios"}', "")
    .replaceAll("selectable={false}", "")
  assert.ok(!code.includes("selectable"), "bubble text selects only through the sheet on Android")
})

test("the session screen wires the buttons to single-implementation handlers", () => {
  const src = readFileSync(path.join(here, "..", "..", "app", "session", "[id].tsx"), "utf8")
  assert.match(src, /onSelectText=\{openSelectTextSheet\}/)
  assert.match(src, /onEdit=\{startEditFlow\}/)
  assert.doesNotMatch(src, /handleMessageLongPress/, "the long-press action sheet is gone")
  assert.doesNotMatch(src, /type AlertButton/, "unused with the sheet removed")
  assert.doesNotMatch(src, /import \{ hasSelectableContent, messagePartsToSelectableText \}/)
  // No half-migrated leftover: the sheet text and the revert flow each live in
  // exactly one place, shared by the buttons.
  assert.doesNotMatch(src, /setTextSheet\(sheetText\)/)
  assert.equal(src.split("revertToMessage(").length - 1, 1, "the revert flow must exist once, in startEditFlow")
})
