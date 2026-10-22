// Sends only public dependency package names and locked versions to npm's
// advisory service. No environment variables, code, or credentials are sent.
const fs = require('node:fs');
const semver = require('../server/node_modules/semver');
(async () => {
  for (const project of ['server','client']) {
    const lock = JSON.parse(fs.readFileSync(`${project}/package-lock.json`));
    const versions = {};
    const direct = new Set(Object.keys(lock.packages[''].dependencies || {}));
    for (const [key,p] of Object.entries(lock.packages)) {
      if (!key || !p.version) continue;
      const name = key.split('node_modules/').pop();
      (versions[name] ??= new Set()).add(p.version);
    }
    const payload = Object.fromEntries(Object.entries(versions).map(([n,v])=>[n,[...v]]));
    const response = await fetch('https://registry.npmjs.org/-/npm/v1/security/advisories/bulk', {
      method: 'POST', headers: {'content-type':'application/json'}, body: JSON.stringify(payload), signal: AbortSignal.timeout(25000),
    });
    if (!response.ok) throw new Error(`npm audit HTTP ${response.status}`);
    const advisories = await response.json();
    fs.writeFileSync(`audit/${project}-advisories.json`, JSON.stringify(advisories,null,2));
    const summary = Object.entries(advisories).flatMap(([name,items])=>items.map(a=>({
      package:name,directRuntimeDependency:direct.has(name),severity:a.severity,title:a.title,
      vulnerable_versions:a.vulnerable_versions,url:a.url,
      affected: Object.entries(lock.packages).filter(([key,p])=>key.split('node_modules/').pop()===name && semver.satisfies(p.version,a.vulnerable_versions,{includePrerelease:true})).map(([key,p])=>({path:key,version:p.version,dev:!!p.dev})),
    }))).filter(a=>a.affected.length>0);
    fs.writeFileSync(`audit/${project}-advisories-summary.json`, JSON.stringify(summary,null,2));
    console.log(JSON.stringify({project,packagesScanned:Object.keys(payload).length,advisories:summary}));
  }
})().catch(e => { console.error(e.message, e.cause?.message || ''); process.exitCode=1; });
