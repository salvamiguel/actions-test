const path = require('path')
const fs = require('fs')
const os = require('os')
const { resolveAction, parseActionRef, githubApiBase } = require('../src/resolver')

describe('parseActionRef', () => {
  it('parses owner/repo@ref', () => {
    expect(parseActionRef('actions/checkout@v4')).toEqual({ owner: 'actions', repo: 'checkout', ref: 'v4' })
  })

  it('parses owner/repo@sha', () => {
    expect(parseActionRef('actions/setup-node@abc1234')).toEqual({ owner: 'actions', repo: 'setup-node', ref: 'abc1234' })
  })

  it('throws on invalid ref format', () => {
    expect(() => parseActionRef('no-at-sign')).toThrow('Invalid action ref')
  })
})

describe('resolveAction - local path', () => {
  let workspace

  beforeEach(() => {
    workspace = fs.mkdtempSync(path.join(os.tmpdir(), 'resolver-test-'))
  })

  afterEach(() => {
    fs.rmSync(workspace, { recursive: true, force: true })
  })

  it('resolves ./relative path relative to workspace', async () => {
    const actionDir = path.join(workspace, 'my-action')
    fs.mkdirSync(actionDir)
    const result = await resolveAction('./my-action', workspace)
    expect(result).toBe(actionDir)
  })

  it('throws when local path does not exist', async () => {
    await expect(resolveAction('./nonexistent', workspace))
      .rejects.toThrow('Action not found at path')
  })
})

describe('githubApiBase', () => {
  const original = process.env.GITHUB_API_URL

  afterEach(() => {
    if (original === undefined) delete process.env.GITHUB_API_URL
    else process.env.GITHUB_API_URL = original
  })

  it('defaults to https://api.github.com when GITHUB_API_URL is not set', () => {
    delete process.env.GITHUB_API_URL
    expect(githubApiBase()).toBe('https://api.github.com')
  })

  it('uses GITHUB_API_URL when set (GitHub Enterprise)', () => {
    process.env.GITHUB_API_URL = 'https://ghes.example.com/api/v3'
    expect(githubApiBase()).toBe('https://ghes.example.com/api/v3')
  })

  it('strips trailing slash from GITHUB_API_URL', () => {
    process.env.GITHUB_API_URL = 'https://ghes.example.com/api/v3/'
    expect(githubApiBase()).toBe('https://ghes.example.com/api/v3')
  })
})
