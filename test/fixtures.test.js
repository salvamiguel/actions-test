const path = require('path')
const { parseAction } = require('../src/parser')
const { setupCapture, readCaptureResult } = require('../src/capture')
const { runNodeAction } = require('../src/runners/node')
const { runCompositeAction } = require('../src/runners/composite')
const { evaluateAssertions } = require('../src/assertions')

const FIXTURES = path.join(__dirname, 'fixtures')

async function runFixture(fixtureName, inputs = {}) {
  const actionDir = path.join(FIXTURES, fixtureName)
  const parsed = await parseAction(actionDir, inputs)
  const captureContext = await setupCapture()
  let runResult
  let captureResult
  try {
    if (parsed.type === 'node') {
      runResult = await runNodeAction({ actionDir, main: parsed.main, resolvedInputs: parsed.resolvedInputs, userEnv: {}, captureContext })
    } else if (parsed.type === 'composite') {
      runResult = await runCompositeAction({ actionDir, steps: parsed.steps, resolvedInputs: parsed.resolvedInputs, userEnv: {}, workspace: actionDir, captureContext })
    }
    captureResult = await readCaptureResult(captureContext, runResult)
  } finally {
    captureContext.cleanup()
  }
  return captureResult
}

// ── hello-action ──────────────────────────────────────────────────────────────

describe('hello-action', () => {
  it('greets with default casing', async () => {
    const result = await runFixture('hello-action', { name: 'World' })
    expect(result.exitCode).toBe(0)
    expect(result.outputs.greeting).toBe('Hello, World!')
    expect(result.stdout).toContain('Hello, World!')
  })

  it('shouts when shout=true', async () => {
    const result = await runFixture('hello-action', { name: 'World', shout: 'true' })
    expect(result.outputs.greeting).toBe('HELLO, WORLD!')
    expect(result.stdout).toContain('HELLO, WORLD!')
  })
})

// ── version-checker-action ────────────────────────────────────────────────────

describe('version-checker-action', () => {
  it('parses a stable semver', async () => {
    const result = await runFixture('version-checker-action', { version: '2.3.1' })
    expect(result.exitCode).toBe(0)
    expect(result.outputs.major).toBe('2')
    expect(result.outputs.minor).toBe('3')
    expect(result.outputs.patch).toBe('1')
    expect(result.outputs['is-prerelease']).toBe('false')
    expect(result.stdout).toContain('Parsed 2.3.1')
  })

  it('detects a prerelease identifier', async () => {
    const result = await runFixture('version-checker-action', { version: '1.0.0-beta.1' })
    expect(result.outputs['is-prerelease']).toBe('true')
    expect(result.stdout).toContain('prerelease: beta.1')
  })

  it('parses a v-prefixed semver', async () => {
    const result = await runFixture('version-checker-action', { version: 'v3.0.0' })
    expect(result.outputs.major).toBe('3')
    expect(result.outputs['is-prerelease']).toBe('false')
  })

  it('fails on an invalid semver string', async () => {
    const result = await runFixture('version-checker-action', { version: 'not-a-version' })
    expect(result.exitCode).not.toBe(0)
    expect(result.stdout).toContain('Invalid semver')
  })
})

// ── env-exporter-action ───────────────────────────────────────────────────────

describe('env-exporter-action', () => {
  it('exports multiple env vars into GITHUB_ENV', async () => {
    const result = await runFixture('env-exporter-action', {
      vars: 'NODE_ENV: test\nAPP_VERSION: 1.2.3\nFEATURE_FLAG: enabled',
    })
    expect(result.exitCode).toBe(0)
    expect(result.envVars.NODE_ENV).toBe('test')
    expect(result.envVars.APP_VERSION).toBe('1.2.3')
    expect(result.envVars.FEATURE_FLAG).toBe('enabled')
    expect(result.stdout).toContain('Exported NODE_ENV=test')
    expect(result.summary).toContain('Exported Variables')
  })

  it('fails when vars is not a map', async () => {
    const result = await runFixture('env-exporter-action', { vars: '- item1\n- item2' })
    expect(result.exitCode).not.toBe(0)
    expect(result.stdout).toContain('vars input must be a YAML map')
  })
})

// ── always-fails-action ───────────────────────────────────────────────────────

describe('always-fails-action', () => {
  it('exits non-zero with the default message', async () => {
    const result = await runFixture('always-fails-action', {})
    expect(result.exitCode).not.toBe(0)
    expect(result.stdout).toContain('This action always fails')
  })

  it('exits non-zero with a custom message', async () => {
    const result = await runFixture('always-fails-action', { message: 'Intentional test failure' })
    expect(result.exitCode).not.toBe(0)
    expect(result.stdout).toContain('Intentional test failure')
  })
})

// ── composite-steps-action ────────────────────────────────────────────────────

describe('composite-steps-action', () => {
  it('runs all three steps and sets GITHUB_OUTPUT', async () => {
    const result = await runFixture('composite-steps-action', {})
    expect(result.exitCode).toBe(0)
    expect(result.stdout).toContain('Step 1 running')
    expect(result.outputs.result).toBe('composite-success')
    expect(result.summary).toContain('Composite Complete')
  })

  it('propagates a custom prefix through steps', async () => {
    const result = await runFixture('composite-steps-action', { prefix: 'release' })
    expect(result.stdout).toContain('prefix=release')
    expect(result.outputs.result).toBe('release-success')
  })
})

// ── assertion engine smoke test against real fixture output ───────────────────

describe('evaluateAssertions against real fixture output', () => {
  it('passes all assertions for version-checker stable run', async () => {
    const captureResult = await runFixture('version-checker-action', { version: '2.3.1' })
    const { failed } = evaluateAssertions(
      `exit_code: 0\noutputs.major: '2'\noutputs.minor: '3'\noutputs.patch: '1'\noutputs.is-prerelease: 'false'\nstdout.contains: "Parsed 2.3.1"`,
      captureResult
    )
    expect(failed).toHaveLength(0)
  })

  it('detects assertion failures on wrong expected values', async () => {
    const captureResult = await runFixture('version-checker-action', { version: '2.3.1' })
    const { failed } = evaluateAssertions(
      `outputs.major: '9'\nstdout.contains: "Parsed 9.0.0"`,
      captureResult
    )
    expect(failed).toHaveLength(2)
  })
})
