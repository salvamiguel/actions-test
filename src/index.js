const core = require('@actions/core')
const yaml = require('js-yaml')
const { resolveAction } = require('./resolver')
const { parseAction } = require('./parser')
const { setupCapture, readCaptureResult } = require('./capture')
const { runNodeAction } = require('./runners/node')
const { runDockerAction } = require('./runners/docker')
const { runCompositeAction } = require('./runners/composite')
const { evaluateAssertions } = require('./assertions')
const { formatReport } = require('./report')

async function run() {
  const actionRef = core.getInput('action', { required: true })
  const inputsYaml = core.getInput('inputs')
  const envYaml = core.getInput('env')
  const assertionsYaml = core.getInput('assertions')
  const expectFailure = core.getInput('expect_failure') === 'true'

  const workspace = process.env.GITHUB_WORKSPACE || process.cwd()
  const userInputs = inputsYaml ? yaml.load(inputsYaml) : {}
  const userEnv = envYaml ? yaml.load(envYaml) : {}

  const actionDir = await resolveAction(actionRef, workspace)
  const parsed = await parseAction(actionDir, userInputs)
  const captureContext = await setupCapture()

  let runResult
  let captureResult
  try {
    if (parsed.type === 'node') {
      runResult = await runNodeAction({ actionDir, main: parsed.main, resolvedInputs: parsed.resolvedInputs, userEnv, captureContext })
    } else if (parsed.type === 'docker') {
      runResult = await runDockerAction({ actionDir, image: parsed.image, resolvedInputs: parsed.resolvedInputs, userEnv, workspace, captureContext })
    } else if (parsed.type === 'composite') {
      runResult = await runCompositeAction({ actionDir, steps: parsed.steps, resolvedInputs: parsed.resolvedInputs, userEnv, workspace, captureContext })
    }
    captureResult = await readCaptureResult(captureContext, runResult)
  } finally {
    captureContext.cleanup()
  }

  const assertionResults = assertionsYaml
    ? evaluateAssertions(assertionsYaml, captureResult)
    : { passed: [], failed: [] }

  const report = formatReport({ actionRef, runnerType: parsed.using, captureResult, assertionResults, expectFailure })
  process.stdout.write(report + '\n')

  try {
    await core.summary.addRaw(report).write()
  } catch {
    // summary unavailable outside GitHub Actions
  }

  const exitOk = expectFailure ? runResult.exitCode !== 0 : runResult.exitCode === 0
  if (assertionResults.failed.length > 0 || !exitOk) {
    core.setFailed(`Action test failed — ${assertionResults.failed.length} assertion(s) failed`)
  }
}

run().catch((err) => core.setFailed(err.message))
