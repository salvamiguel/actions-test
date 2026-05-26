const fs = require('fs')
const path = require('path')
const { spawn } = require('child_process')

async function runNodeAction({ actionDir, main, resolvedInputs, userEnv, captureContext: _captureContext }) {
  const nodePath = buildNodePath(actionDir)
  const env = {
    ...process.env,
    ...(nodePath ? { NODE_PATH: nodePath } : {}),
    ...buildInputEnv(resolvedInputs),
    ...(userEnv || {}),
  }
  return spawnCapture('node', [main], { cwd: actionDir, env })
}

function buildNodePath(actionDir) {
  const parts = []

  // In GitHub Actions, GITHUB_WORKSPACE/node_modules holds all installed packages
  const ws = process.env.GITHUB_WORKSPACE
  if (ws) parts.push(path.join(ws, 'node_modules'))

  // Local dev fallback: traverse up from the action directory
  let dir = path.dirname(actionDir)
  while (dir !== path.dirname(dir)) {
    const nm = path.join(dir, 'node_modules')
    if (fs.existsSync(nm) && !parts.includes(nm)) { parts.push(nm); break }
    dir = path.dirname(dir)
  }

  const existing = process.env.NODE_PATH
  if (existing) parts.push(existing)

  return parts.join(path.delimiter)
}

function buildInputEnv(resolvedInputs) {
  const env = {}
  for (const [key, value] of Object.entries(resolvedInputs)) {
    env[`INPUT_${key.toUpperCase().replace(/-/g, '_')}`] = value
  }
  return env
}

function spawnCapture(cmd, args, options) {
  return new Promise((resolve) => {
    const stdoutChunks = []
    const stderrChunks = []

    const child = spawn(cmd, args, { ...options, stdio: 'pipe' })

    child.stdout.on('data', (chunk) => { process.stdout.write(chunk); stdoutChunks.push(chunk) })
    child.stderr.on('data', (chunk) => { process.stderr.write(chunk); stderrChunks.push(chunk) })
    child.on('close', (code) => {
      resolve({
        exitCode: code ?? 1,
        stdout: Buffer.concat(stdoutChunks).toString(),
        stderr: Buffer.concat(stderrChunks).toString(),
      })
    })
  })
}

module.exports = { runNodeAction, buildInputEnv, spawnCapture }
