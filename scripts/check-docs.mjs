import fs from 'node:fs'
import path from 'node:path'
import process from 'node:process'

const repoRoot = process.cwd()

function walkMarkdown(relativeDir) {
  const absoluteDir = path.join(repoRoot, relativeDir)
  if (!fs.existsSync(absoluteDir)) return []

  return fs.readdirSync(absoluteDir, { withFileTypes: true }).flatMap((entry) => {
    const relativePath = path.join(relativeDir, entry.name)
    if (entry.isDirectory()) return walkMarkdown(relativePath)
    return entry.isFile() && entry.name.endsWith('.md') ? [relativePath] : []
  })
}

const governedDirs = [
  'docs/reference',
  'docs/runbooks',
  'docs/decisions',
  'docs/rfcs',
]

const governedFiles = governedDirs.flatMap(walkMarkdown)
const linkCheckedFiles = [
  'README.md',
  'CLAUDE.md',
  'docs/README.md',
  'docs/documentation-policy.md',
  'docs/archive/README.md',
  ...governedFiles,
]

const errors = []
const requiredMetadata = ['type', 'status', 'owner', 'last_verified']

function frontmatter(content) {
  if (!content.startsWith('---\n')) return null
  const end = content.indexOf('\n---\n', 4)
  if (end === -1) return null
  return content.slice(4, end)
}

for (const relativeFile of governedFiles) {
  const content = fs.readFileSync(path.join(repoRoot, relativeFile), 'utf8')
  const metadata = frontmatter(content)

  if (!metadata) {
    errors.push(`${relativeFile}: missing YAML frontmatter`)
    continue
  }

  for (const key of requiredMetadata) {
    if (!new RegExp(`^${key}:\\s*\\S+`, 'm').test(metadata)) {
      errors.push(`${relativeFile}: missing metadata field '${key}'`)
    }
  }
}

for (const relativeFile of [...new Set(linkCheckedFiles)]) {
  const absoluteFile = path.join(repoRoot, relativeFile)
  if (!fs.existsSync(absoluteFile)) {
    errors.push(`${relativeFile}: indexed document does not exist`)
    continue
  }

  const content = fs.readFileSync(absoluteFile, 'utf8')

  if (content.includes('docs-for-humans')) {
    errors.push(`${relativeFile}: references removed docs-for-humans path`)
  }
  if (content.includes('/Users/')) {
    errors.push(`${relativeFile}: contains a machine-specific absolute path`)
  }

  for (const match of content.matchAll(/\[[^\]]*\]\(([^)]+)\)/g)) {
    let target = match[1].trim()
    if (target.startsWith('<') && target.endsWith('>')) {
      target = target.slice(1, -1)
    }

    if (/^(?:https?:|mailto:|#|data:|app:)/.test(target)) continue

    target = target.split(/\s+["']/)[0]
    const withoutAnchor = target.split('#')[0]
    if (!withoutAnchor) continue

    let decodedTarget
    try {
      decodedTarget = decodeURIComponent(withoutAnchor)
    } catch {
      errors.push(`${relativeFile}: invalid URL encoding in '${target}'`)
      continue
    }

    const resolved = path.resolve(path.dirname(absoluteFile), decodedTarget)
    if (!fs.existsSync(resolved)) {
      errors.push(`${relativeFile}: broken local link '${target}'`)
    }
  }
}

if (errors.length > 0) {
  console.error(`Documentation check failed with ${errors.length} issue(s):`)
  for (const error of errors) console.error(`- ${error}`)
  process.exit(1)
}

console.log(`Documentation check passed (${governedFiles.length} governed files).`)
