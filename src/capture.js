const fs = require('fs')
const os = require('os')
const path = require('path')

const CAPTURE_VARS = ['GITHUB_OUTPUT', 'GITHUB_STEP_SUMMARY', 'GITHUB_ENV', 'GITHUB_PATH']

async function setupCapture() {
  const tmpDir = fs.mkdtempSync(path.join(os.tmpdir(), 'action-tester-'))

  const outputFile = path.join(tmpDir, 'github_output')
  const summaryFile = path.join(tmpDir, 'github_step_summary')
  const envFile = path.join(tmpDir, 'github_env')
  const pathFile = path.join(tmpDir, 'github_path')

  for (const f of [outputFile, summaryFile, envFile, pathFile]) {
    fs.writeFileSync(f, '')
  }

  const saved = {}
  for (const key of CAPTURE_VARS) {
    saved[key] = process.env[key]
  }

  process.env.GITHUB_OUTPUT = outputFile
  process.env.GITHUB_STEP_SUMMARY = summaryFile
  process.env.GITHUB_ENV = envFile
  process.env.GITHUB_PATH = pathFile

  function cleanup() {
    for (const [key, val] of Object.entries(saved)) {
      if (val === undefined) {
        delete process.env[key]
      } else {
        process.env[key] = val
      }
    }
    fs.rmSync(tmpDir, { recursive: true, force: true })
  }

  return { outputFile, summaryFile, envFile, pathFile, cleanup }
}

function parseKvFile(content) {
  const result = {}
  const lines = content.split('\n')
  let i = 0
  while (i < lines.length) {
    const line = lines[i]
    if (!line.trim()) { i++; continue }

    const delimMatch = line.match(/^([^=]+)<<(.+)$/)
    if (delimMatch) {
      const [, key, delimiter] = delimMatch
      const valueLines = []
      i++
      while (i < lines.length && lines[i] !== delimiter) {
        valueLines.push(lines[i])
        i++
      }
      result[key] = valueLines.join('\n')
    } else {
      const eqIdx = line.indexOf('=')
      if (eqIdx !== -1) {
        result[line.slice(0, eqIdx)] = line.slice(eqIdx + 1)
      }
    }
    i++
  }
  return result
}

async function readCaptureResult(ctx, { stdout, stderr, exitCode }) {
  const outputContent = fs.readFileSync(ctx.outputFile, 'utf8')
  const summaryContent = fs.readFileSync(ctx.summaryFile, 'utf8')
  const envContent = fs.readFileSync(ctx.envFile, 'utf8')

  return {
    outputs: parseKvFile(outputContent),
    summary: summaryContent,
    envVars: parseKvFile(envContent),
    stdout,
    stderr,
    exitCode,
  }
}

module.exports = { setupCapture, readCaptureResult }
