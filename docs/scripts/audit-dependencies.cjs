/* Audits only the two local package lockfiles. Reports contain no environment values. */
const fs = require('node:fs');
const path = require('node:path');
const { spawnSync } = require('node:child_process');
const crypto = require('node:crypto');
const root = path.resolve(__dirname, '../..');
// Fresh scans must not overwrite the immutable M0 checkpoint reports.
const destination = path.join(root, 'audit/m1-closure/dependencies');
fs.mkdirSync(destination, { recursive: true });
const exceptions = JSON.parse(fs.readFileSync(path.join(root, 'docs/dependency-exceptions.json'), 'utf8'));
const verification = { checkedAt: new Date().toISOString(), packages: [] };
for (const name of ['server', 'client']) {
  const result = spawnSync(process.platform === 'win32' ? 'npm.cmd' : 'npm', ['audit', '--json'], { cwd: path.join(root, name), encoding: 'utf8', shell: process.platform === 'win32', maxBuffer: 5 * 1024 * 1024 });
  let report;
  try { report = JSON.parse(result.stdout); } catch { throw new Error(`Audit service failed for ${name}: ${result.stderr}`); }
  if (report.error || !report.metadata) throw new Error(`Audit service failed for ${name}`);
  fs.writeFileSync(path.join(destination, `${name}-audit.json`), JSON.stringify(report, null, 2) + '\n');
  const lockBytes = fs.readFileSync(path.join(root, name, 'package-lock.json'));
  const lock = JSON.parse(lockBytes);
  const exception = exceptions[name];
  const issues = Object.values(report.vulnerabilities).map((v) => {
    const developmentOnly = v.nodes.length > 0 && v.nodes.every((p) => lock.packages[p]?.dev === true);
    const accepted = developmentOnly && exception && Date.parse(exception.expiresAt) > Date.now() && exception.packages.includes(v.name)
      && v.via.every((a) => typeof a === 'string' ? exception.packages.includes(a) : exception.advisoryIds.includes(a.source));
    return { name: v.name, severity: v.severity, developmentOnly, accepted: Boolean(accepted), paths: v.nodes };
  });
  const unaccepted = issues.filter((v) => !v.accepted);
  const evidence = { name, lockSha256: crypto.createHash('sha256').update(lockBytes).digest('hex'), counts: report.metadata.vulnerabilities, runtimeAdvisoryPackages: issues.filter((v) => !v.developmentOnly).length, exceptionExpiry: exception?.expiresAt, issues };
  verification.packages.push(evidence);
  console.log(JSON.stringify(evidence, null, 2));
  if (unaccepted.length) process.exitCode = 1;
}
fs.writeFileSync(path.join(destination, 'dependency-verification.json'), JSON.stringify(verification, null, 2) + '\n');
