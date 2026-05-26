const fs = require('fs')
const path = require('path')
const yaml = require('js-yaml')

async function parseAction(actionDir, providedInputs) {
  const ymlPath = path.join(actionDir, 'action.yml')
  const yamlPath = path.join(actionDir, 'action.yaml')

  let actionFilePath
  if (fs.existsSync(ymlPath)) actionFilePath = ymlPath
  else if (fs.existsSync(yamlPath)) actionFilePath = yamlPath
  else throw new Error(`No action.yml or action.yaml found in ${actionDir}`)

  const actionDef = yaml.load(fs.readFileSync(actionFilePath, 'utf8'))
  const using = actionDef.runs?.using || ''
  const resolvedInputs = resolveInputs(actionDef.inputs || {}, providedInputs || {})

  if (using.startsWith('node')) {
    return { type: 'node', using, main: path.join(actionDir, actionDef.runs.main), image: null, steps: null, resolvedInputs }
  }

  if (using === 'docker') {
    return { type: 'docker', using, main: null, image: actionDef.runs.image, steps: null, resolvedInputs }
  }

  if (using === 'composite') {
    return { type: 'composite', using, main: null, image: null, steps: actionDef.runs.steps || [], resolvedInputs }
  }

  throw new Error(`Unsupported runner type: "${using}"`)
}

function resolveInputs(inputsDef, providedInputs) {
  const missing = []
  const resolved = {}

  for (const [name, def] of Object.entries(inputsDef)) {
    if (providedInputs[name] !== undefined) {
      resolved[name] = String(providedInputs[name])
    } else if (def.default !== undefined && def.default !== null && !isExpression(def.default)) {
      resolved[name] = String(def.default)
    } else if (def.required === true) {
      missing.push(name)
    }
  }

  if (missing.length > 0) throw new Error(`Missing required inputs: ${missing.join(', ')}`)
  return resolved
}

function isExpression(value) {
  return typeof value === 'string' && /^\$\{\{/.test(value.trim())
}

module.exports = { parseAction }
