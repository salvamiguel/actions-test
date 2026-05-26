const core = require('@actions/core')

async function run() {
  const message = core.getInput('message')
  const exitCode = parseInt(core.getInput('exit-code'), 10) || 1

  core.setFailed(message)
  process.exitCode = exitCode
}

run().catch(core.setFailed)
