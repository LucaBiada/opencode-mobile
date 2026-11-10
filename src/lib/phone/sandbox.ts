// Path and glob rules for the phone workspace sandbox. Kept free of React
// Native imports so they can be unit-tested with plain `node --test`.

export class PathEscapeError extends Error {
  constructor(input: string) {
    super(`Path escapes the workspace: ${input}`)
    this.name = "PathEscapeError"
  }
}

// Turns a model-supplied path into a workspace-relative one. Absolute paths,
// drive letters, home shorthand and any `..` segment are rejected outright
// rather than clamped: a model that asks to leave the sandbox is a bug or an
// injection attempt, and silently rewriting the path would hide it.
export function normalizeRelative(input: string): string {
  const raw = (input ?? "").trim().replace(/\\/g, "/")
  if (!raw || raw === ".") return ""
  if (raw.startsWith("/") || /^[a-zA-Z]:/.test(raw) || raw.startsWith("~")) throw new PathEscapeError(input)

  const segments: string[] = []
  for (const segment of raw.split("/")) {
    if (!segment || segment === ".") continue
    if (segment === "..") throw new PathEscapeError(input)
    segments.push(segment)
  }
  return segments.join("/")
}

export function isWithin(root: string, candidate: string): boolean {
  const normalizedRoot = root.replace(/\\/g, "/").replace(/\/+$/, "")
  const normalizedCandidate = candidate.replace(/\\/g, "/")
  return normalizedCandidate === normalizedRoot || normalizedCandidate.startsWith(`${normalizedRoot}/`)
}

// Glob matching for `glob` and `list` ignores. `**` crosses directories, `*`
// and `?` do not. A pattern without a slash matches the basename, which is what
// people expect from `*.ts`.
export function globToRegExp(pattern: string): RegExp {
  const source = pattern.replace(/\\/g, "/")
  let regex = ""
  for (let i = 0; i < source.length; i++) {
    const char = source[i]
    if (char === "*") {
      if (source[i + 1] === "*") {
        i++
        if (source[i + 1] === "/") {
          i++
          regex += "(?:.*/)?"
          continue
        }
        regex += ".*"
        continue
      }
      regex += "[^/]*"
      continue
    }
    if (char === "?") {
      regex += "[^/]"
      continue
    }
    regex += char.replace(/[.+^${}()|[\]\\]/g, "\\$&")
  }
  const anchored = source.includes("/") ? `^${regex}$` : `(?:^|/)${regex}$`
  return new RegExp(anchored)
}
