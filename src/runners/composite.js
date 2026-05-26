const { resolveAction } = require('../resolver')
const { parseAction } = require('../parser')
const { buildInputEnv, spawnCapture } = require('./node')

async function runCompositeAction({ actionDir: _actionDir, steps, resolvedInputs, userEnv, workspace, captureContext }) {
  const stdoutParts = []
  const stderrParts = []
  let lastExitCode = 0

  for (const step of steps) {
    let result
    if (step.run) {
      result = await runShellStep(step, resolvedInputs, userEnv || {}, workspace)
    } else if (step.uses) {
      result = await runUsesStep(step, resolvedInputs, userEnv || {}, workspace, captureContext)
    } else {
      continue
    }
    stdoutParts.push(result.stdout)
    stderrParts.push(result.stderr)
    lastExitCode = result.exitCode
  }

  return {
    exitCode: lastExitCode,
    stdout: stdoutParts.join(''),
    stderr: stderrParts.join(''),
  }
}

function runShellStep(step, resolvedInputs, userEnv, workspace) {
  const shell = step.shell || 'bash'
  const env = { ...process.env, ...buildInputEnv(resolvedInputs), ...userEnv, ...(step.env || {}) }
  // script comes from action.yml (action author code, not user input) — -c is safe
  return spawnCapture(shell, ['-c', step.run], { cwd: workspace, env })
}

async function runUsesStep(step, _parentInputs, userEnv, workspace, captureContext) {
  const { runNodeAction } = require('./node')
  const { runDockerAction } = require('./docker')

  const stepInputs = step.with || {}
  const stepEnv = { ...userEnv, ...(step.env || {}) }
  const nestedActionDir = await resolveAction(step.uses, workspace)
  const parsed = await parseAction(nestedActionDir, stepInputs)

  if (parsed.type === 'node') {
    return runNodeAction({ actionDir: nestedActionDir, main: parsed.main, resolvedInputs: parsed.resolvedInputs, userEnv: stepEnv, captureContext })
  }
  if (parsed.type === 'docker') {
    return runDockerAction({ actionDir: nestedActionDir, image: parsed.image, resolvedInputs: parsed.resolvedInputs, userEnv: stepEnv, workspace, captureContext })
  }
  if (parsed.type === 'composite') {
    return runCompositeAction({ actionDir: nestedActionDir, steps: parsed.steps, resolvedInputs: parsed.resolvedInputs, userEnv: stepEnv, workspace, captureContext })
  }
  throw new Error(`Unsupported runner type in nested step: ${parsed.type}`)
}

module.exports = { runCompositeAction }
