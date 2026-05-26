const fs = require('fs')
const path = require('path')
const yaml = require('js-yaml')

function evaluateAssertions(assertionsYaml, captureResult) {
  const assertions = yaml.load(assertionsYaml)
  const passed = []
  const failed = []

  for (const [key, rawExpected] of Object.entries(assertions)) {
    const values = Array.isArray(rawExpected) ? rawExpected : [rawExpected]
    for (const raw of values) {
      const expected = String(raw)
      const result = evaluate(key, expected, captureResult)
      const entry = { key, expected, actual: result.actual, message: result.message }
      if (result.pass) passed.push(entry)
      else failed.push(entry)
    }
  }

  return { passed, failed }
}

function evaluate(key, expected, captureResult) {
  if (key === 'exit_code') {
    const actual = String(captureResult.exitCode)
    return { pass: actual === expected, actual, message: `expected exit code ${expected}, got ${actual}` }
  }

  if (key.startsWith('outputs.')) {
    const name = key.slice('outputs.'.length)
    const actual = captureResult.outputs[name]
    return { pass: actual === expected, actual: actual ?? '(not set)', message: `expected outputs.${name} to be "${expected}", got "${actual ?? '(not set)'}"` }
  }

  if (key === 'stdout.contains') {
    const pass = captureResult.stdout.includes(expected)
    return { pass, actual: pass ? expected : '(not found)', message: `expected stdout to contain "${expected}"` }
  }

  if (key === 'stdout.matches') {
    const pass = new RegExp(expected).test(captureResult.stdout)
    return { pass, actual: pass ? expected : '(no match)', message: `expected stdout to match /${expected}/` }
  }

  if (key === 'stderr.contains') {
    const pass = captureResult.stderr.includes(expected)
    return { pass, actual: pass ? expected : '(not found)', message: `expected stderr to contain "${expected}"` }
  }

  if (key === 'files.exist') {
    const filePath = path.isAbsolute(expected)
      ? expected
      : path.resolve(process.env.GITHUB_WORKSPACE || process.cwd(), expected)
    const pass = fs.existsSync(filePath)
    return { pass, actual: pass ? filePath : '(not found)', message: `expected file to exist at: ${filePath}` }
  }

  if (key === 'files.not_exist') {
    const filePath = path.isAbsolute(expected)
      ? expected
      : path.resolve(process.env.GITHUB_WORKSPACE || process.cwd(), expected)
    const pass = !fs.existsSync(filePath)
    return { pass, actual: pass ? '(absent)' : filePath, message: `expected file NOT to exist at: ${filePath}` }
  }

  if (key === 'summary.contains') {
    const pass = captureResult.summary.includes(expected)
    return { pass, actual: pass ? expected : '(not found)', message: `expected summary to contain "${expected}"` }
  }

  if (key.startsWith('env.')) {
    const name = key.slice('env.'.length)
    const actual = captureResult.envVars[name]
    return { pass: actual === expected, actual: actual ?? '(not set)', message: `expected env.${name} to be "${expected}", got "${actual ?? '(not set)'}"` }
  }

  return { pass: false, actual: '(unknown key)', message: `Unknown assertion key: "${key}"` }
}

module.exports = { evaluateAssertions }
