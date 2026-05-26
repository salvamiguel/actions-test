const crypto = require('crypto')
const { spawnSync } = require('child_process')
const { buildInputEnv, spawnCapture } = require('./node')

async function runDockerAction({ actionDir, image, resolvedInputs, userEnv, workspace, captureContext }) {
  const dockerCheck = spawnSync('docker', ['info'], { stdio: 'pipe' })
  if (dockerCheck.status !== 0) {
    throw new Error(
      'Docker is not available on this runner. Docker actions require a runner with Docker installed (e.g. ubuntu-latest).'
    )
  }

  const imageTag = await resolveImage(image, actionDir)
  const runArgs = buildRunArgs(imageTag, resolvedInputs, userEnv || {}, workspace, captureContext)
  return spawnCapture('docker', runArgs, {})
}

async function resolveImage(image, actionDir) {
  if (image === 'Dockerfile') {
    const tag = `action-tester-${crypto.createHash('sha256').update(actionDir).digest('hex').slice(0, 12)}`
    const result = spawnSync('docker', ['build', '-t', tag, actionDir], { stdio: 'inherit' })
    if (result.status !== 0) throw new Error(`docker build failed with status ${result.status}`)
    return tag
  }

  const imageRef = image.replace(/^docker:\/\//, '')
  const result = spawnSync('docker', ['pull', imageRef], { stdio: 'inherit' })
  if (result.status !== 0) throw new Error(`docker pull failed for ${imageRef}`)
  return imageRef
}

function buildRunArgs(imageTag, resolvedInputs, userEnv, workspace, captureContext) {
  const args = ['run', '--rm']

  args.push('-v', `${workspace}:/github/workspace`)
  args.push('-w', '/github/workspace')

  for (const f of [captureContext.outputFile, captureContext.summaryFile, captureContext.envFile, captureContext.pathFile]) {
    args.push('-v', `${f}:${f}`)
  }

  args.push('-e', `GITHUB_OUTPUT=${captureContext.outputFile}`)
  args.push('-e', `GITHUB_STEP_SUMMARY=${captureContext.summaryFile}`)
  args.push('-e', `GITHUB_ENV=${captureContext.envFile}`)
  args.push('-e', `GITHUB_PATH=${captureContext.pathFile}`)

  for (const [key, value] of Object.entries(buildInputEnv(resolvedInputs))) {
    args.push('-e', `${key}=${value}`)
  }
  for (const [key, value] of Object.entries(userEnv)) {
    args.push('-e', `${key}=${value}`)
  }

  args.push(imageTag)
  return args
}

module.exports = { runDockerAction }
