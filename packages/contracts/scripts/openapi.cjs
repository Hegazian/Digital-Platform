const fs = require('node:fs');
const path = require('node:path');
const { z } = require('zod');
const contracts = require('../dist');
const schemas = Object.fromEntries(Object.entries(contracts)
  .filter(([name, value]) => name.endsWith('Schema') && value instanceof z.ZodType)
  .map(([name, value]) => [name.replace(/Schema$/, ''), z.toJSONSchema(value, { io: 'input', unrepresentable: 'any' })]));
const document = { openapi: '3.1.0', info: { title: 'Educational Platform contracts', version: '0.1.0' },
  // Component definitions are executable contracts. The owning domain adds a
  // path only when its endpoint is implemented and its response is validated.
  paths: {}, components: { schemas } };
fs.writeFileSync(path.resolve(__dirname, '../openapi.json'), JSON.stringify(document, null, 2) + '\n');
