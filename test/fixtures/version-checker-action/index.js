const core = require('@actions/core')

const SEMVER = /^v?(\d+)\.(\d+)\.(\d+)(?:-([a-zA-Z0-9][a-zA-Z0-9.\-]*))?(?:\+[a-zA-Z0-9.\-]+)?$/

async function run() {
  const version = core.getInput('version', { required: true })
  const match = version.match(SEMVER)

  if (!match) {
    core.setFailed(`Invalid semver: "${version}"`)
    return
  }

  const [, major, minor, patch, prerelease] = match
  const isPrerelease = Boolean(prerelease)

  core.setOutput('major', major)
  core.setOutput('minor', minor)
  core.setOutput('patch', patch)
  core.setOutput('is-prerelease', String(isPrerelease))

  process.stdout.write(`Parsed ${version}: ${major}.${minor}.${patch}${isPrerelease ? ` (prerelease: ${prerelease})` : ''}\n`)
  await core.summary
    .addHeading('Version')
    .addTable([
      [{ data: 'Component', header: true }, { data: 'Value', header: true }],
      ['major', major],
      ['minor', minor],
      ['patch', patch],
      ['prerelease', isPrerelease ? prerelease : '—'],
    ])
    .write()
}

run().catch(core.setFailed)
