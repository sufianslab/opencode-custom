#!/usr/bin/env bun

/**
 * After merging upstream/dev, re-assert that upstream-only workflows do not run
 * on this fork. Only job-level `if:` keys are changed (four-space indent), never
 * step-level conditions.
 */

import { spawnSync } from "node:child_process"
import { readdirSync, readFileSync, writeFileSync } from "node:fs"
import path from "node:path"

const root = path.join(import.meta.dirname, "../..")
const workflowsDir = path.join(root, ".github/workflows")
const GATE = "github.repository == 'anomalyco/opencode'"

const GATED = new Set([
  "check.yml",
  "check-test.yml",
  "check-docs.yml",
  "check-nix.yml",
  "check-bot-scope.yml",
  "check-process-daemon.yml",
  "release-process-daemon.yml",
  "triage-pr-standards.yml",
  "triage-compliance-close.yml",
  "triage-close-prs.yml",
  "triage-close-issues.yml",
  "triage-contributor.yml",
])

function splitJobs(source: string) {
  const marker = "\njobs:\n"
  const idx = source.indexOf(marker)
  if (idx === -1) {
    if (source.startsWith("jobs:\n")) return ["", source.slice("jobs:\n".length)] as const
    return [source, undefined] as const
  }
  return [source.slice(0, idx + 1), source.slice(idx + marker.length)] as const
}

function gateJobBody(body: string) {
  if (body.includes(GATE) || body.includes('github.repository == "anomalyco/opencode"')) return body

  // Job-level keys use exactly four spaces. Step conditions use deeper indent.
  const jobIf = /^    if:\s*(.+)$/m.exec(body)
  if (!jobIf) return `    if: ${GATE}\n` + body

  const expr = jobIf[1].trim()
  if (expr.includes("anomalyco/opencode")) return body

  let next: string
  if (expr.startsWith("${{") && expr.endsWith("}}")) {
    const inner = expr.slice(3, -2).trim()
    next = `\${{ ${GATE} && ${inner} }}`
  } else {
    next = `${GATE} && ${expr}`
  }
  return body.replace(/^    if:\s*.+$/m, `    if: ${next}`)
}

function ensureJobGates(source: string) {
  const [preamble, jobs] = splitJobs(source)
  if (jobs === undefined) return source

  const re = /^  ([A-Za-z0-9_-]+):\n((?:    .*\n|\n)*)/gm
  let result = ""
  let last = 0
  let match: RegExpExecArray | null
  while ((match = re.exec(jobs)) !== null) {
    result += jobs.slice(last, match.index)
    result += `  ${match[1]}:\n` + gateJobBody(match[2])
    last = match.index + match[0].length
  }
  result += jobs.slice(last)
  return preamble + "jobs:\n" + result
}

const touched: string[] = []
for (const name of readdirSync(workflowsDir).sort()) {
  if (!GATED.has(name)) continue
  const file = path.join(workflowsDir, name)
  const before = readFileSync(file, "utf8")
  const after = ensureJobGates(before)
  if (after !== before) {
    writeFileSync(file, after)
    touched.push(path.relative(root, file))
    console.log(`gated ${name}`)
    continue
  }
  console.log(`ok ${name}`)
}

const commit = process.env.FORK_GATES_COMMIT === "1"
if (commit && touched.length > 0) {
  spawnSync("git", ["add", "--", ...touched], { cwd: root, stdio: "inherit" })
  const status = spawnSync("git", ["diff", "--cached", "--quiet"], { cwd: root })
  if (status.status !== 0) {
    spawnSync("git", ["commit", "-m", "chore(fork): re-apply upstream workflow gates after sync"], {
      cwd: root,
      stdio: "inherit",
    })
  }
}

console.log(`done (${touched.length} file(s) updated)`)

