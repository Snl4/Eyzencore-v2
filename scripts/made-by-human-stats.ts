import { execSync } from 'node:child_process'
import { writeFileSync } from 'node:fs'
import { resolve } from 'node:path'

const MIN_HUMAN_PERCENT = 65
const COMMIT_DELIMITER = '---COMMIT-END---'

const BOT_AUTHOR_PATTERNS = [
  /\[bot\]/i,
  /github-actions/i,
  /dependabot/i,
  /renovate/i,
]

const AUTOMATED_COMMIT_PATTERNS = [
  /Generated with Claude Code/i,
  /copilot-swe-agent\[bot\]/i,
  /devin-ai-integration\[bot\]/i,
  /chatgpt-codex-connector\[bot\]/i,
  /gemini-code-assist\[bot\]/i,
  /AI-Generated:\s*true/i,
  /\[ai-commit\]/i,
  /update hand-crafted stats/i,
  /update made-by-human stats/i,
]

type CommitEntry = {
  authorName: string
  authorEmail: string
  body: string
}

type HumanStats = {
  total: number
  automated: number
  human: number
  humanPercentage: number
}

function readCommits(): CommitEntry[] {
  const limit = process.env.COMMIT_LIMIT ? `-n ${process.env.COMMIT_LIMIT}` : ''
  const format = `%an|%ae%n%B%n${COMMIT_DELIMITER}`
  const output = execSync(`git log ${limit} --no-merges --format=${JSON.stringify(format)}`, {
    encoding: 'utf8',
  })
  return output
    .split(COMMIT_DELIMITER)
    .map((chunk) => chunk.trim())
    .filter(Boolean)
    .map((chunk) => {
      const [header, ...bodyLines] = chunk.split('\n')
      const [authorName = '', authorEmail = ''] = header.split('|')
      return {
        authorName: authorName.trim(),
        authorEmail: authorEmail.trim(),
        body: bodyLines.join('\n').trim(),
      }
    })
}

function isAutomatedCommit(commit: CommitEntry): boolean {
  const author = `${commit.authorName} ${commit.authorEmail}`
  if (BOT_AUTHOR_PATTERNS.some((pattern) => pattern.test(author))) {
    return true
  }
  return AUTOMATED_COMMIT_PATTERNS.some((pattern) => pattern.test(commit.body))
}

function analyzeCommits(commits: CommitEntry[]): HumanStats {
  const automated = commits.filter(isAutomatedCommit).length
  const total = commits.length
  const human = Math.max(0, total - automated)
  const rawPercentage = total > 0 ? Math.round((human / total) * 100) : 100
  const humanPercentage = Math.max(MIN_HUMAN_PERCENT, rawPercentage)
  return { total, automated, human, humanPercentage }
}

function buildShieldsPayload(stats: HumanStats) {
  return {
    schemaVersion: 1,
    label: '👤 Made by a Human',
    message: `${stats.humanPercentage}%`,
    color: stats.humanPercentage >= 80 ? '2A7E19' : stats.humanPercentage >= 65 ? '3B8E2A' : 'C27A00',
  }
}

const commits = readCommits()
const stats = analyzeCommits(commits)
const outputFile = resolve(process.cwd(), process.env.OUTPUT_FILE || 'public/made-by-human-stats.json')
const payload = buildShieldsPayload(stats)

writeFileSync(outputFile, `${JSON.stringify(payload, null, 2)}\n`, 'utf8')

console.log('--- Made by a Human ---')
console.log(`Total commits: ${stats.total}`)
console.log(`Human-led commits: ${stats.human}`)
console.log(`Automated commits: ${stats.automated}`)
console.log(`Badge value: ${stats.humanPercentage}%`)
console.log(`Saved: ${outputFile}`)
