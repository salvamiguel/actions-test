const fs = require('fs')

function parseSimpleYamlMap(str) {
  const result = {}
  for (const line of str.split('\n')) {
    const trimmed = line.trim()
    if (!trimmed) continue
    if (trimmed.startsWith('- ')) return null
    const idx = trimmed.indexOf(':')
    if (idx === -1) return null
    result[trimmed.slice(0, idx).trim()] = trimmed.slice(idx + 1).trim()
  }
  return Object.keys(result).length > 0 ? result : null
}

const vars = parseSimpleYamlMap(process.env.INPUT_VARS || '')

if (!vars) {
  process.stdout.write('::error::vars input must be a YAML map of key: value pairs\n')
  process.exitCode = 1
} else {
  const envFile = process.env.GITHUB_ENV
  const summaryFile = process.env.GITHUB_STEP_SUMMARY

  if (summaryFile) fs.appendFileSync(summaryFile, '# Exported Variables\n\n| Name | Value |\n|------|-------|\n')

  for (const [key, value] of Object.entries(vars)) {
    process.stdout.write(`Exported ${key}=${value}\n`)
    if (envFile) fs.appendFileSync(envFile, `${key}=${value}\n`)
    if (summaryFile) fs.appendFileSync(summaryFile, `| ${key} | ${value} |\n`)
  }
}
