const fs = require('node:fs');
const path = require('node:path');
const ts = require('../server/node_modules/typescript');
function walk(dir) {
  return fs.readdirSync(dir, { withFileTypes: true }).flatMap((e) => {
    const p = path.join(dir, e.name);
    return e.isDirectory() ? walk(p) : [p.replaceAll('\\', '/')];
  });
}
const files = [...walk('server/src'), ...walk('client/src')].filter(p => /\.tsx?$/.test(p));
const tests = [...files.filter(p => /\.(spec|test)\.ts$/.test(p)), ...walk('client/e2e').filter(p => /\.spec\.ts$/.test(p))];
const source = files.filter(p => !/\.(spec|test)\.ts$/.test(p));
const routes = [];
for (const file of source.filter(p => p.endsWith('.routes.ts'))) {
  const text = fs.readFileSync(file, 'utf8');
  const ast = ts.createSourceFile(file, text, ts.ScriptTarget.Latest, true);
  function visit(n) {
    if (ts.isCallExpression(n) && ts.isPropertyAccessExpression(n.expression) && /^(get|post|patch|put|delete)$/.test(n.expression.name.text)) {
      routes.push({ file, line: ast.getLineAndCharacterOfPosition(n.getStart()).line + 1,
        method: n.expression.name.text.toUpperCase(), path: n.arguments[0]?.text,
        handlers: n.arguments.slice(1).map(a => a.getText(ast)),
        bodyValidated: n.arguments.some(a => /validateBody\(/.test(a.getText(ast))) });
    }
    ts.forEachChild(n, visit);
  }
  visit(ast);
}
const modules = fs.readdirSync('server/src/modules', { withFileTypes: true }).filter(e => e.isDirectory()).map(e => {
  const prefix = `server/src/modules/${e.name}/`;
  return { name: e.name, sourceFiles: source.filter(p => p.startsWith(prefix)).length, testFiles: tests.filter(p => p.startsWith(prefix)).length,
    testCases: tests.filter(p => p.startsWith(prefix)).reduce((n,p) => n + (fs.readFileSync(p,'utf8').match(/\b(?:it|test)(?:\.skip|\.todo)?\s*\(/g)||[]).length,0) };
});
const result = { generatedAt: '2026-10-21', sourceFiles: source.length,
  sourceLines: source.reduce((n,p) => n + fs.readFileSync(p,'utf8').split('\n').length,0),
  serverTestFiles: tests.filter(p => p.startsWith('server')).length, clientE2eFiles: tests.filter(p => p.startsWith('client/e2e')).length,
  clientComponentTestFiles: tests.filter(p => p.startsWith('client/src')).length,
  declaredCases: tests.reduce((n,p) => n + (fs.readFileSync(p,'utf8').match(/\b(?:it|test)(?:\.skip|\.todo)?\s*\(/g)||[]).length,0),
  routeCount: routes.length, writeRoutesWithoutBodySchema: routes.filter(r => /POST|PATCH|PUT/.test(r.method) && !r.bodyValidated), modules, routes };
fs.writeFileSync('audit/inventory.json', JSON.stringify(result,null,2));
console.log(JSON.stringify({ ...result, routes: undefined, writeRoutesWithoutBodySchema: result.writeRoutesWithoutBodySchema.length, modules: undefined }, null, 2));
console.log(JSON.stringify(modules));
