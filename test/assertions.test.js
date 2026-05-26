const { evaluateAssertions } = require('../src/assertions')

const baseResult = {
  exitCode: 0,
  outputs: { ref: 'refs/heads/main', sha: 'abc123' },
  stdout: 'Checking out refs/heads/main\nDone.',
  stderr: 'warning: something',
  summary: 'Checked out main branch',
  envVars: { NODE_VERSION: '20' },
}

describe('evaluateAssertions — exit_code', () => {
  it('passes when exit code matches', () => {
    expect(evaluateAssertions('exit_code: 0', baseResult).failed).toHaveLength(0)
  })

  it('fails when exit code does not match', () => {
    const { failed } = evaluateAssertions('exit_code: 1', baseResult)
    expect(failed).toHaveLength(1)
    expect(failed[0].key).toBe('exit_code')
  })
})

describe('evaluateAssertions — outputs.*', () => {
  it('passes when output matches', () => {
    expect(evaluateAssertions('outputs.ref: refs/heads/main', baseResult).failed).toHaveLength(0)
  })

  it('fails when output does not match', () => {
    expect(evaluateAssertions('outputs.ref: wrong-ref', baseResult).failed).toHaveLength(1)
  })

  it('fails when output key is absent', () => {
    expect(evaluateAssertions('outputs.missing: value', baseResult).failed).toHaveLength(1)
  })
})

describe('evaluateAssertions — stdout', () => {
  it('passes stdout.contains when substring present', () => {
    expect(evaluateAssertions('stdout.contains: "Checking out"', baseResult).failed).toHaveLength(0)
  })

  it('fails stdout.contains when substring absent', () => {
    expect(evaluateAssertions('stdout.contains: "not present"', baseResult).failed).toHaveLength(1)
  })

  it('passes stdout.matches with valid regex', () => {
    expect(evaluateAssertions('stdout.matches: "Checking out refs/.*"', baseResult).failed).toHaveLength(0)
  })

  it('fails stdout.matches when regex does not match', () => {
    expect(evaluateAssertions('stdout.matches: "no-match-xyz"', baseResult).failed).toHaveLength(1)
  })
})

describe('evaluateAssertions — stderr', () => {
  it('passes stderr.contains when substring present', () => {
    expect(evaluateAssertions('stderr.contains: "warning:"', baseResult).failed).toHaveLength(0)
  })
})

describe('evaluateAssertions — summary', () => {
  it('passes summary.contains when substring present', () => {
    expect(evaluateAssertions('summary.contains: "Checked out"', baseResult).failed).toHaveLength(0)
  })
})

describe('evaluateAssertions — env.*', () => {
  it('passes when env var matches', () => {
    expect(evaluateAssertions('env.NODE_VERSION: "20"', baseResult).failed).toHaveLength(0)
  })

  it('fails when env var does not match', () => {
    expect(evaluateAssertions('env.NODE_VERSION: "18"', baseResult).failed).toHaveLength(1)
  })
})

describe('evaluateAssertions — files', () => {
  it('passes files.exist when file is present', () => {
    expect(evaluateAssertions(`files.exist: "${__filename}"`, baseResult).failed).toHaveLength(0)
  })

  it('fails files.exist when file is absent', () => {
    expect(evaluateAssertions('files.exist: /nonexistent/path/file.txt', baseResult).failed).toHaveLength(1)
  })

  it('passes files.not_exist when file is absent', () => {
    expect(evaluateAssertions('files.not_exist: /nonexistent/path/file.txt', baseResult).failed).toHaveLength(0)
  })

  it('fails files.not_exist when file exists', () => {
    expect(evaluateAssertions(`files.not_exist: "${__filename}"`, baseResult).failed).toHaveLength(1)
  })
})

describe('evaluateAssertions — accumulation', () => {
  it('accumulates all failures without stopping at first', () => {
    const assertionsYaml = `exit_code: 1\nstdout.contains: "not present"\noutputs.ref: wrong-ref`
    const { failed, passed } = evaluateAssertions(assertionsYaml, baseResult)
    expect(failed).toHaveLength(3)
    expect(passed).toHaveLength(0)
  })

  it('returns entries with key/expected/actual/message fields', () => {
    const { passed } = evaluateAssertions('exit_code: 0', baseResult)
    expect(passed[0]).toMatchObject({ key: 'exit_code', expected: '0' })
  })
})

describe('evaluateAssertions — array values', () => {
  it('accepts a list for files.exist and checks each path', () => {
    const { failed, passed } = evaluateAssertions(
      `files.exist:\n  - "${__filename}"\n  - "${__filename}"`,
      baseResult
    )
    expect(failed).toHaveLength(0)
    expect(passed).toHaveLength(2)
  })

  it('reports each failing item in a list independently', () => {
    const { failed } = evaluateAssertions(
      `files.exist:\n  - "${__filename}"\n  - /nonexistent/a.txt\n  - /nonexistent/b.txt`,
      baseResult
    )
    expect(failed).toHaveLength(2)
    expect(failed[0].expected).toBe('/nonexistent/a.txt')
    expect(failed[1].expected).toBe('/nonexistent/b.txt')
  })

  it('accepts a list for stdout.contains', () => {
    const { failed } = evaluateAssertions(
      'stdout.contains:\n  - "Checking out"\n  - "Done."',
      baseResult
    )
    expect(failed).toHaveLength(0)
  })
})
