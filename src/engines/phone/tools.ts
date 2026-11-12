import { tool } from "ai"
import { z } from "zod"

import { readText, findFiles, grep, resolveDirectory, resolveFile, walk, writeText } from "./workspace"

// Approval gate supplied by the engine. Tools that mutate the workspace call it
// before doing anything; the engine turns it into a permission card in the chat.
export type ApprovalRequest = (tool: string, input: Record<string, unknown>, preview?: string) => Promise<void>

const MAX_READ_LINES = 2000
const MAX_READ_BYTES = 50 * 1024
const MAX_TOOL_BYTES = 50 * 1024

const todos = new Map<string, Array<{ content: string; status: string }>>()

function clip(value: string, max = MAX_TOOL_BYTES): string {
  if (value.length <= max) return value
  return `${value.slice(0, max)}\n… truncated (${value.length - max} more characters)`
}

export function createPhoneTools(
  sessionID: string,
  requestApproval: ApprovalRequest,
  openFile?: (path: string) => void,
) {
  return {
    open_file: tool({
      description:
        "Show a workspace file to the user in the app's preview screen. Call this whenever the user asks to open, show, view or preview a file (for example an HTML page or an image you created).",
      inputSchema: z.object({
        filePath: z.string().describe("Workspace-relative path of the file to show"),
      }),
      execute: async ({ filePath }) => {
        const file = resolveFile(sessionID, filePath)
        if (!file.exists) throw new Error(`No such file: ${filePath} (use glob to find the exact path)`)
        openFile?.(filePath)
        return `Opened ${filePath} in the preview screen.`
      },
    }),
    read: tool({
      description: "Read a text file from the workspace. Returns numbered lines.",
      inputSchema: z.object({
        filePath: z.string().describe("Workspace-relative path"),
        offset: z.number().int().nonnegative().optional().describe("1-based first line"),
        limit: z.number().int().positive().optional().describe("Maximum lines to return"),
      }),
      execute: async ({ filePath, offset, limit }) => {
        const content = await readText(sessionID, filePath)
        const lines = content.split("\n")
        const start = Math.max(0, (offset ?? 1) - 1)
        const end = Math.min(lines.length, start + Math.min(limit ?? MAX_READ_LINES, MAX_READ_LINES))
        const body = lines
          .slice(start, end)
          .map((line, index) => `${start + index + 1}: ${line}`)
          .join("\n")
        const suffix = end < lines.length ? `\n… ${lines.length - end} more lines (use offset/limit)` : ""
        return clip(body + suffix)
      },
    }),

    list: tool({
      description: "List files and directories inside the workspace.",
      inputSchema: z.object({
        path: z.string().optional().describe("Workspace-relative directory, defaults to the root"),
        ignore: z.array(z.string()).optional().describe("Glob patterns to skip"),
      }),
      execute: async ({ path, ignore }) => {
        const entries = walk(sessionID, path ?? "", 2000)
        const ignored = (ignore ?? []).map((pattern) => new RegExp(pattern))
        const visible = entries.filter((entry) => !ignored.some((re) => re.test(entry.path)))
        if (visible.length === 0) return "(empty)"
        return clip(
          visible
            .map((entry) => `${entry.isDirectory ? "dir " : "file"} ${entry.path}${entry.size ? ` (${entry.size}b)` : ""}`)
            .join("\n"),
        )
      },
    }),

    glob: tool({
      description: "Find files by glob pattern, for example src/**/*.ts or *.md.",
      inputSchema: z.object({
        pattern: z.string(),
        path: z.string().optional(),
      }),
      execute: async ({ pattern, path }) => {
        const files = findFiles(sessionID, pattern, path ?? "")
        return files.length === 0 ? "No matches." : clip(files.join("\n"))
      },
    }),

    grep: tool({
      description: "Search file contents with a regular expression.",
      inputSchema: z.object({
        pattern: z.string().describe("JavaScript regular expression"),
        path: z.string().optional(),
        include: z.string().optional().describe("Glob limiting which files are searched"),
      }),
      execute: async ({ pattern, path, include }) => {
        const hits = await grep(sessionID, pattern, { path, include })
        if (hits.length === 0) return "No matches."
        return clip(hits.map((hit) => `${hit.path}:${hit.line}: ${hit.text}`).join("\n"))
      },
    }),

    write: tool({
      description: "Create or overwrite a file. Requires the user's approval.",
      inputSchema: z.object({
        filePath: z.string(),
        content: z.string(),
      }),
      execute: async ({ filePath, content }) => {
        await requestApproval("write", { filePath, content }, `${filePath}\n\n${clip(content, 1200)}`)
        writeText(sessionID, filePath, content)
        return `Wrote ${filePath} (${content.length} characters).`
      },
    }),

    edit: tool({
      description: "Replace an exact string in a file. Requires the user's approval.",
      inputSchema: z.object({
        filePath: z.string(),
        oldString: z.string(),
        newString: z.string(),
        replaceAll: z.boolean().optional(),
      }),
      execute: async ({ filePath, oldString, newString, replaceAll }) => {
        await requestApproval(
          "edit",
          { filePath, oldString, newString },
          `${filePath}\n\n- ${clip(oldString, 400)}\n+ ${clip(newString, 400)}`,
        )
        const current = await readText(sessionID, filePath)
        const occurrences = current.split(oldString).length - 1
        if (occurrences === 0) throw new Error(`oldString not found in ${filePath}`)
        if (occurrences > 1 && !replaceAll) {
          throw new Error(`oldString appears ${occurrences} times in ${filePath}; pass replaceAll or make it unique`)
        }
        const next = replaceAll ? current.split(oldString).join(newString) : current.replace(oldString, newString)
        writeText(sessionID, filePath, next)
        return `Edited ${filePath} (${occurrences} replacement${occurrences === 1 ? "" : "s"}).`
      },
    }),

    todowrite: tool({
      description: "Replace the session todo list.",
      inputSchema: z.object({
        todos: z.array(
          z.object({
            content: z.string(),
            status: z.enum(["pending", "in_progress", "completed"]),
          }),
        ),
      }),
      execute: async ({ todos: next }) => {
        todos.set(sessionID, next)
        return next.map((todo, index) => `${index + 1}. [${todo.status}] ${todo.content}`).join("\n") || "(empty)"
      },
    }),

    todoread: tool({
      description: "Read the session todo list.",
      inputSchema: z.object({}),
      execute: async () => {
        const list = todos.get(sessionID) ?? []
        return list.map((todo, index) => `${index + 1}. [${todo.status}] ${todo.content}`).join("\n") || "(empty)"
      },
    }),
  }
}

// Exposed for tests and for the workspace browser screen.
export function workspaceListing(sessionID: string): string[] {
  return resolveDirectory(sessionID, "").list().map((entry) => entry.uri)
}
