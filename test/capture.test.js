const fs = require('fs')
const { setupCapture, readCaptureResult } = require('../src/capture')

describe('setupCapture', () => {
  it('creates temp files and sets GITHUB_* env vars', async () => {
    const ctx = await setupCapture()
    expect(process.env.GITHUB_OUTPUT).toBe(ctx.outputFile)
    expect(process.env.GITHUB_STEP_SUMMARY).toBe(ctx.summaryFile)
    expect(process.env.GITHUB_ENV).toBe(ctx.envFile)
    expect(process.env.GITHUB_PATH).toBe(ctx.pathFile)
    expect(fs.existsSync(ctx.outputFile)).toBe(true)
    ctx.cleanup()
  })

  it('cleanup restores original env vars', async () => {
    const original = process.env.GITHUB_OUTPUT
    const ctx = await setupCapture()
    ctx.cleanup()
    expect(process.env.GITHUB_OUTPUT).toBe(original)
  })

  it('cleanup deletes the temp files', async () => {
    const ctx = await setupCapture()
    const { outputFile } = ctx
    ctx.cleanup()
    expect(fs.existsSync(outputFile)).toBe(false)
  })
})

describe('readCaptureResult', () => {
  it('parses KEY=VALUE pairs from output file', async () => {
    const ctx = await setupCapture()
    fs.writeFileSync(ctx.outputFile, 'ref=refs/heads/main\nsha=abc123\n')
    const result = await readCaptureResult(ctx, { stdout: '', stderr: '', exitCode: 0 })
    expect(result.outputs).toEqual({ ref: 'refs/heads/main', sha: 'abc123' })
    ctx.cleanup()
  })

  it('parses multiline values with <<delimiter syntax', async () => {
    const ctx = await setupCapture()
    fs.writeFileSync(ctx.outputFile, 'body<<EOF\nline1\nline2\nEOF\n')
    const result = await readCaptureResult(ctx, { stdout: '', stderr: '', exitCode: 0 })
    expect(result.outputs.body).toBe('line1\nline2')
    ctx.cleanup()
  })

  it('reads summary file as raw string', async () => {
    const ctx = await setupCapture()
    fs.writeFileSync(ctx.summaryFile, '## Hello\nworld')
    const result = await readCaptureResult(ctx, { stdout: '', stderr: '', exitCode: 0 })
    expect(result.summary).toBe('## Hello\nworld')
    ctx.cleanup()
  })

  it('passes through exitCode, stdout, stderr', async () => {
    const ctx = await setupCapture()
    const result = await readCaptureResult(ctx, { stdout: 'out', stderr: 'err', exitCode: 42 })
    expect(result.exitCode).toBe(42)
    expect(result.stdout).toBe('out')
    expect(result.stderr).toBe('err')
    ctx.cleanup()
  })

  it('returns empty outputs when output file is empty', async () => {
    const ctx = await setupCapture()
    const result = await readCaptureResult(ctx, { stdout: '', stderr: '', exitCode: 0 })
    expect(result.outputs).toEqual({})
    expect(result.envVars).toEqual({})
    ctx.cleanup()
  })
})
