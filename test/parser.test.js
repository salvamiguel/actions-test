const path = require('path')
const fs = require('fs')
const os = require('os')
const { parseAction } = require('../src/parser')

let tmpDir

beforeEach(() => {
  tmpDir = fs.mkdtempSync(path.join(os.tmpdir(), 'parser-test-'))
})

afterEach(() => {
  fs.rmSync(tmpDir, { recursive: true, force: true })
})

function writeActionYml(content) {
  fs.writeFileSync(path.join(tmpDir, 'action.yml'), content.trim())
}

describe('parseAction — runner detection', () => {
  it('detects node runner type', async () => {
    writeActionYml(`
name: test
runs:
  using: node24
  main: index.js
`)
    const result = await parseAction(tmpDir, {})
    expect(result.type).toBe('node')
    expect(result.main).toBe(path.join(tmpDir, 'index.js'))
    expect(result.using).toBe('node24')
  })

  it('detects node24 runner type', async () => {
    writeActionYml(`
name: test
runs:
  using: node24
  main: dist/index.js
`)
    const result = await parseAction(tmpDir, {})
    expect(result.type).toBe('node')
    expect(result.main).toBe(path.join(tmpDir, 'dist/index.js'))
  })

  it('detects docker runner type', async () => {
    writeActionYml(`
name: test
runs:
  using: docker
  image: Dockerfile
`)
    const result = await parseAction(tmpDir, {})
    expect(result.type).toBe('docker')
    expect(result.image).toBe('Dockerfile')
  })

  it('detects composite runner type', async () => {
    writeActionYml(`
name: test
runs:
  using: composite
  steps:
    - run: echo hello
      shell: bash
`)
    const result = await parseAction(tmpDir, {})
    expect(result.type).toBe('composite')
    expect(result.steps).toHaveLength(1)
  })

  it('throws on unsupported runner', async () => {
    writeActionYml(`
name: test
runs:
  using: python3
  main: main.py
`)
    await expect(parseAction(tmpDir, {})).rejects.toThrow('Unsupported runner type')
  })
})

describe('parseAction — input handling', () => {
  it('merges provided inputs with defaults', async () => {
    writeActionYml(`
name: test
inputs:
  required-input:
    required: true
  optional-input:
    default: hello
runs:
  using: node24
  main: index.js
`)
    const result = await parseAction(tmpDir, { 'required-input': 'value' })
    expect(result.resolvedInputs).toEqual({
      'required-input': 'value',
      'optional-input': 'hello',
    })
  })

  it('throws when required inputs are missing', async () => {
    writeActionYml(`
name: test
inputs:
  first:
    required: true
  second:
    required: true
runs:
  using: node24
  main: index.js
`)
    await expect(parseAction(tmpDir, {})).rejects.toThrow('Missing required inputs: first, second')
  })

  it('accepts action with no inputs defined', async () => {
    writeActionYml(`
name: test
runs:
  using: node24
  main: index.js
`)
    const result = await parseAction(tmpDir, {})
    expect(result.resolvedInputs).toEqual({})
  })

  it('skips null defaults so the env var is never set (e.g. actions/checkout filter input)', async () => {
    writeActionYml(`
name: test
inputs:
  filter:
    default: null
  token:
    default: hello
runs:
  using: node24
  main: index.js
`)
    const result = await parseAction(tmpDir, {})
    expect('filter' in result.resolvedInputs).toBe(false)
    expect(result.resolvedInputs.token).toBe('hello')
  })

  it('skips expression defaults so they are never passed as literals (e.g. token: ${{ github.token }})', async () => {
    writeActionYml(`
name: test
inputs:
  token:
    default: \${{ github.token }}
  persist-credentials:
    default: 'true'
runs:
  using: node24
  main: index.js
`)
    const result = await parseAction(tmpDir, {})
    expect('token' in result.resolvedInputs).toBe(false)
    expect(result.resolvedInputs['persist-credentials']).toBe('true')
  })

  it('uses caller-provided value even when default is an expression', async () => {
    writeActionYml(`
name: test
inputs:
  token:
    default: \${{ github.token }}
runs:
  using: node24
  main: index.js
`)
    const result = await parseAction(tmpDir, { token: 'ghs_explicit' })
    expect(result.resolvedInputs.token).toBe('ghs_explicit')
  })
})

describe('parseAction — file lookup', () => {
  it('finds action.yaml as fallback when action.yml is absent', async () => {
    fs.writeFileSync(path.join(tmpDir, 'action.yaml'), `
name: test
runs:
  using: node24
  main: index.js
`.trim())
    const result = await parseAction(tmpDir, {})
    expect(result.type).toBe('node')
  })

  it('throws when neither action.yml nor action.yaml exists', async () => {
    await expect(parseAction(tmpDir, {})).rejects.toThrow('No action.yml or action.yaml found')
  })
})
