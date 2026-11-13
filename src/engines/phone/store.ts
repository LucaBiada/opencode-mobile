import * as SQLite from "expo-sqlite"

import type { Message, MessageWithParts, Part, Session } from "../../lib/sdk"
import type { Provider } from "../../lib/phone/providers"

// Phone-mode sessions live on the device. They are kept in their own tables so
// nothing from remote mode (which caches server state) can collide with them.
const DB_NAME = "devmote.db"

let database: Promise<SQLite.SQLiteDatabase> | null = null

function open(): Promise<SQLite.SQLiteDatabase> {
  if (!database) database = init()
  return database
}

async function init(): Promise<SQLite.SQLiteDatabase> {
  const db = await SQLite.openDatabaseAsync(DB_NAME)
  await db.execAsync(`
    PRAGMA journal_mode = WAL;
    CREATE TABLE IF NOT EXISTS phone_sessions (
      id TEXT PRIMARY KEY NOT NULL,
      title TEXT NOT NULL,
      model TEXT NOT NULL,
      provider_id TEXT NOT NULL DEFAULT 'opencode-go',
      created_at INTEGER NOT NULL,
      updated_at INTEGER NOT NULL
    );
    CREATE TABLE IF NOT EXISTS phone_providers (
      id TEXT PRIMARY KEY NOT NULL,
      name TEXT NOT NULL,
      base_url TEXT NOT NULL,
      models_url TEXT NOT NULL,
      format TEXT NOT NULL,
      requires_key INTEGER NOT NULL,
      tools INTEGER NOT NULL,
      builtin INTEGER NOT NULL
    );
    CREATE TABLE IF NOT EXISTS phone_audit (
      id TEXT PRIMARY KEY NOT NULL,
      session_id TEXT NOT NULL,
      tool TEXT NOT NULL,
      decision TEXT NOT NULL,
      detail TEXT,
      created_at INTEGER NOT NULL
    );
    CREATE TABLE IF NOT EXISTS phone_messages (
      id TEXT PRIMARY KEY NOT NULL,
      session_id TEXT NOT NULL,
      role TEXT NOT NULL,
      model TEXT,
      created_at INTEGER NOT NULL,
      completed_at INTEGER,
      error TEXT,
      tokens TEXT
    );
    CREATE INDEX IF NOT EXISTS phone_messages_session ON phone_messages(session_id, created_at);
    CREATE TABLE IF NOT EXISTS phone_parts (
      id TEXT PRIMARY KEY NOT NULL,
      message_id TEXT NOT NULL,
      seq INTEGER NOT NULL,
      type TEXT NOT NULL,
      data TEXT NOT NULL
    );
    CREATE INDEX IF NOT EXISTS phone_parts_message ON phone_parts(message_id, seq);
  `)
  // Sessions created before providers existed keep working against Go.
  const columns = await db.getAllAsync<{ name: string }>("PRAGMA table_info(phone_sessions)")
  if (!columns.some((column) => column.name === "provider_id")) {
    await db.execAsync("ALTER TABLE phone_sessions ADD COLUMN provider_id TEXT NOT NULL DEFAULT 'opencode-go'")
  }
  return db
}

interface SessionRow {
  id: string
  title: string
  model: string
  provider_id: string
  created_at: number
  updated_at: number
}

interface MessageRow {
  id: string
  session_id: string
  role: "user" | "assistant"
  model: string | null
  created_at: number
  completed_at: number | null
  error: string | null
  tokens: string | null
}

interface PartRow {
  id: string
  message_id: string
  seq: number
  type: string
  data: string
}

function toSession(row: SessionRow): Session {
  return {
    id: row.id,
    slug: row.id,
    projectID: "phone",
    directory: "",
    providerID: row.provider_id,
    title: row.title,
    // Phone sessions reuse `version` to carry the model id: the field is
    // otherwise meaningless for an on-device chat, and this keeps the shared
    // Session shape unchanged.
    version: row.model,
    time: { created: row.created_at, updated: row.updated_at },
  }
}

function toMessage(row: MessageRow): Message {
  const message: Message = {
    id: row.id,
    sessionID: row.session_id,
    role: row.role,
    time: { created: row.created_at },
    modelID: row.model ?? undefined,
  }
  if (row.completed_at) message.time.completed = row.completed_at
  if (row.error) message.error = { message: row.error }
  if (row.tokens) {
    try {
      message.tokens = JSON.parse(row.tokens)
    } catch {
      // ignore a malformed usage blob
    }
  }
  return message
}

function toPart(row: PartRow): Part {
  const data = JSON.parse(row.data) as Partial<Part>
  return { ...data, id: row.id, messageID: row.message_id, type: row.type as Part["type"] } as Part
}

export async function listPhoneSessions(): Promise<Session[]> {
  const db = await open()
  const rows = await db.getAllAsync<SessionRow>("SELECT * FROM phone_sessions ORDER BY updated_at DESC")
  return rows.map(toSession)
}

export async function getPhoneSession(sessionID: string): Promise<Session | null> {
  const db = await open()
  const row = await db.getFirstAsync<SessionRow>("SELECT * FROM phone_sessions WHERE id = ?", sessionID)
  return row ? toSession(row) : null
}

export async function insertPhoneSession(session: Session, modelID: string, providerID = "opencode-go"): Promise<void> {
  const db = await open()
  await db.runAsync(
    "INSERT INTO phone_sessions (id, title, model, provider_id, created_at, updated_at) VALUES (?, ?, ?, ?, ?, ?)",
    session.id,
    session.title,
    modelID,
    providerID,
    session.time.created,
    session.time.updated,
  )
}

export async function getPhoneSessionConfig(sessionID: string): Promise<{ providerID: string; modelID: string }> {
  const db = await open()
  const row = await db.getFirstAsync<{ model: string; provider_id: string }>(
    "SELECT model, provider_id FROM phone_sessions WHERE id = ?",
    sessionID,
  )
  return { providerID: row?.provider_id ?? "opencode-go", modelID: row?.model ?? "deepseek-v4.1-flash" }
}

interface ProviderRow {
  id: string
  name: string
  base_url: string
  models_url: string
  format: string
  requires_key: number
  tools: number
  builtin: number
}

function toProvider(row: ProviderRow): Provider {
  return {
    id: row.id,
    name: row.name,
    baseURL: row.base_url,
    modelsURL: row.models_url,
    format: row.format as Provider["format"],
    requiresKey: Boolean(row.requires_key),
    tools: Boolean(row.tools),
    builtin: Boolean(row.builtin),
  }
}

export async function listProviders(): Promise<Provider[]> {
  const db = await open()
  const rows = await db.getAllAsync<ProviderRow>("SELECT * FROM phone_providers ORDER BY builtin DESC, name ASC")
  return rows.map(toProvider)
}

export async function getProvider(id: string): Promise<Provider | null> {
  const db = await open()
  const row = await db.getFirstAsync<ProviderRow>("SELECT * FROM phone_providers WHERE id = ?", id)
  return row ? toProvider(row) : null
}

export async function upsertProvider(provider: Provider): Promise<void> {
  const db = await open()
  await db.runAsync(
    `INSERT OR REPLACE INTO phone_providers (id, name, base_url, models_url, format, requires_key, tools, builtin)
     VALUES (?, ?, ?, ?, ?, ?, ?, ?)`,
    provider.id,
    provider.name,
    provider.baseURL,
    provider.modelsURL,
    provider.format,
    provider.requiresKey ? 1 : 0,
    provider.tools ? 1 : 0,
    provider.builtin ? 1 : 0,
  )
}

export async function deleteProvider(id: string): Promise<void> {
  const db = await open()
  await db.runAsync("DELETE FROM phone_providers WHERE id = ? AND builtin = 0", id)
}

// Presets are seeded once into the database so the UI can treat built-in and
// user-added providers identically (edit, test, pick).
// Durable record of every approval decision for a mutating tool. Logs vanish on
// reinstall and logcat rotates; if a write ever executes without a matching
// audit row, that is a gate bypass and this table is how we catch it.
export async function appendApprovalAudit(entry: {
  sessionID: string
  tool: string
  decision: string
  detail?: string
}): Promise<void> {
  const db = await open()
  await db.runAsync(
    "INSERT INTO phone_audit (id, session_id, tool, decision, detail, created_at) VALUES (?, ?, ?, ?, ?, ?)",
    `${Date.now().toString(36)}_${Math.random().toString(36).slice(2, 8)}`,
    entry.sessionID,
    entry.tool,
    entry.decision,
    entry.detail ?? null,
    Date.now(),
  )
}

export async function listApprovalAudit(sessionID: string): Promise<
  Array<{ tool: string; decision: string; detail: string | null; created_at: number }>
> {
  const db = await open()
  return db.getAllAsync("SELECT tool, decision, detail, created_at FROM phone_audit WHERE session_id = ? ORDER BY created_at DESC", sessionID)
}

export async function seedProviders(presets: Provider[]): Promise<void> {
  const db = await open()
  const row = await db.getFirstAsync<{ count: number }>("SELECT COUNT(*) AS count FROM phone_providers")
  if ((row?.count ?? 0) > 0) return
  for (const preset of presets) await upsertProvider(preset)
}

export async function setPhoneSessionModel(sessionID: string, modelID: string): Promise<void> {
  const db = await open()
  await db.runAsync("UPDATE phone_sessions SET model = ?, updated_at = ? WHERE id = ?", modelID, Date.now(), sessionID)
}

export async function touchPhoneSession(sessionID: string, patch: { title?: string; updated?: number } = {}): Promise<void> {
  const db = await open()
  if (patch.title !== undefined) {
    await db.runAsync("UPDATE phone_sessions SET title = ?, updated_at = ? WHERE id = ?", patch.title, patch.updated ?? Date.now(), sessionID)
    return
  }
  await db.runAsync("UPDATE phone_sessions SET updated_at = ? WHERE id = ?", patch.updated ?? Date.now(), sessionID)
}

export async function deletePhoneSession(sessionID: string): Promise<void> {
  const db = await open()
  await db.withTransactionAsync(async () => {
    await db.runAsync("DELETE FROM phone_parts WHERE message_id IN (SELECT id FROM phone_messages WHERE session_id = ?)", sessionID)
    await db.runAsync("DELETE FROM phone_messages WHERE session_id = ?", sessionID)
    await db.runAsync("DELETE FROM phone_sessions WHERE id = ?", sessionID)
  })
}

export async function listPhoneMessages(sessionID: string): Promise<MessageWithParts[]> {
  const db = await open()
  const messages = await db.getAllAsync<MessageRow>(
    "SELECT * FROM phone_messages WHERE session_id = ? ORDER BY created_at ASC",
    sessionID,
  )
  if (messages.length === 0) return []
  const parts = await db.getAllAsync<PartRow>(
    "SELECT p.* FROM phone_parts p JOIN phone_messages m ON m.id = p.message_id WHERE m.session_id = ? ORDER BY p.message_id, p.seq",
    sessionID,
  )
  const byMessage = new Map<string, Part[]>()
  for (const row of parts) {
    byMessage.set(row.message_id, [...(byMessage.get(row.message_id) ?? []), toPart(row)])
  }
  return messages.map((row) => ({ info: toMessage(row), parts: byMessage.get(row.id) ?? [] }))
}

export async function insertPhoneMessage(message: Message): Promise<void> {
  const db = await open()
  await db.runAsync(
    "INSERT INTO phone_messages (id, session_id, role, model, created_at) VALUES (?, ?, ?, ?, ?)",
    message.id,
    message.sessionID,
    message.role,
    message.modelID ?? message.model?.modelID ?? null,
    message.time.created,
  )
}

export async function completePhoneMessage(
  messageID: string,
  patch: { completed?: number; error?: string; tokens?: Message["tokens"] } = {},
): Promise<void> {
  const db = await open()
  await db.runAsync(
    "UPDATE phone_messages SET completed_at = ?, error = ?, tokens = ? WHERE id = ?",
    patch.completed ?? null,
    patch.error ?? null,
    patch.tokens ? JSON.stringify(patch.tokens) : null,
    messageID,
  )
}

export async function upsertPhonePart(part: Part, seq = 0): Promise<void> {
  const db = await open()
  const { id, messageID, type, ...rest } = part
  await db.runAsync(
    "INSERT OR REPLACE INTO phone_parts (id, message_id, seq, type, data) VALUES (?, ?, ?, ?, ?)",
    id,
    messageID,
    seq,
    type,
    JSON.stringify(rest),
  )
}
