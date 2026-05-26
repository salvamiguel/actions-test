const fs = require('fs')

const SEMVER = /^v?(\d+)\.(\d+)\.(\d+)(?:-([a-zA-Z0-9][a-zA-Z0-9.\-]*))?(?:\+[a-zA-Z0-9.\-]+)?$/

const version = process.env.INPUT_VERSION || ''
const match = version.match(SEMVER)

if (!match) {
  process.stdout.write(`::error::Invalid semver: "${version}"\n`)
  process.exitCode = 1
} else {
  const [, major, minor, patch, prerelease] = match
  const isPrerelease = Boolean(prerelease)

  const out = process.env.GITHUB_OUTPUT
  if (out) {
    fs.appendFileSync(out, `major=${major}\n`)
    fs.appendFileSync(out, `minor=${minor}\n`)
    fs.appendFileSync(out, `patch=${patch}\n`)
    fs.appendFileSync(out, `is-prerelease=${isPrerelease}\n`)
  }

  process.stdout.write(`Parsed ${version}: ${major}.${minor}.${patch}${isPrerelease ? ` (prerelease: ${prerelease})` : ''}\n`)

  const summary = process.env.GITHUB_STEP_SUMMARY
  if (summary) {
    fs.appendFileSync(summary, `# Version ${major}.${minor}.${patch}\n\n`)
    fs.appendFileSync(summary, `| Component | Value |\n|-----------|-------|\n`)
    fs.appendFileSync(summary, `| major | ${major} |\n| minor | ${minor} |\n| patch | ${patch} |\n`)
    fs.appendFileSync(summary, `| prerelease | ${isPrerelease ? prerelease : '—'} |\n`)
  }
}
