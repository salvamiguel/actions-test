const core = require('@actions/core')
const yaml = require('js-yaml')

async function run() {
  const varsInput = core.getInput('vars', { required: true })
  const vars = yaml.load(varsInput)

  if (typeof vars !== 'object' || vars === null || Array.isArray(vars)) {
    core.setFailed('vars input must be a YAML map of key: value pairs')
    return
  }

  for (const [key, value] of Object.entries(vars)) {
    core.exportVariable(key, String(value))
    process.stdout.write(`Exported ${key}=${value}\n`)
  }

  await core.summary
    .addHeading('Exported Variables')
    .addTable([
      [{ data: 'Name', header: true }, { data: 'Value', header: true }],
      ...Object.entries(vars).map(([k, v]) => [k, String(v)]),
    ])
    .write()
}

run().catch(core.setFailed)
