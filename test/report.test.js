const { formatReport } = require('../src/report')

const baseParams = {
  actionRef: 'actions/checkout@v4',
  runnerType: 'node24',
  captureResult: { exitCode: 0, outputs: {}, stdout: '', stderr: '', summary: '', envVars: {} },
  assertionResults: {
    passed: [{ key: 'exit_code', expected: '0', actual: '0', message: '' }],
    failed: [],
  },
  expectFailure: false,
}

describe('formatReport', () => {
  it('includes the action ref', () => {
    expect(formatReport(baseParams)).toContain('actions/checkout@v4')
  })

  it('includes the runner type', () => {
    expect(formatReport(baseParams)).toContain('node24')
  })

  it('shows PASS for passing assertions', () => {
    expect(formatReport(baseParams)).toContain('PASS')
  })

  it('shows the result as PASSED when all assertions pass', () => {
    expect(formatReport(baseParams)).toContain('Result: PASSED')
  })

  it('shows FAIL and message for failing assertions', () => {
    const params = {
      ...baseParams,
      assertionResults: {
        passed: [],
        failed: [{ key: 'exit_code', expected: '1', actual: '0', message: 'expected 1 got 0' }],
      },
    }
    const report = formatReport(params)
    expect(report).toContain('FAIL')
    expect(report).toContain('exit_code')
    expect(report).toContain('expected 1 got 0')
  })

  it('shows the result as FAILED when any assertion fails', () => {
    const params = {
      ...baseParams,
      assertionResults: { passed: [], failed: [{ key: 'exit_code', expected: '1', actual: '0', message: '' }] },
    }
    expect(formatReport(params)).toContain('Result: FAILED')
  })

  it('shows counts of passed and failed assertions', () => {
    const params = {
      ...baseParams,
      assertionResults: {
        passed: [{ key: 'exit_code', expected: '0', actual: '0', message: '' }],
        failed: [{ key: 'stdout.contains', expected: 'x', actual: '(not found)', message: 'msg' }],
      },
    }
    const report = formatReport(params)
    expect(report).toContain('1 passed')
    expect(report).toContain('1 failed')
  })

  it('marks exit as FAIL when expect_failure is false but exit code is non-zero', () => {
    const params = { ...baseParams, captureResult: { ...baseParams.captureResult, exitCode: 1 } }
    expect(formatReport(params)).toContain('FAIL')
  })

  it('marks exit as PASS and result PASSED when expect_failure is true and exit code is non-zero', () => {
    const params = {
      ...baseParams,
      captureResult: { ...baseParams.captureResult, exitCode: 1 },
      assertionResults: { passed: [], failed: [] },
      expectFailure: true,
    }
    expect(formatReport(params)).toContain('Result: PASSED')
  })
})
