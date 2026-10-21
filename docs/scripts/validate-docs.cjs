/* Static documentation verification only; does not load app code or contact services. */
const fs = require('node:fs');
const path = require('node:path');
const crypto = require('node:crypto');
const root = path.resolve(__dirname,'../..');
const read = p => fs.readFileSync(path.join(root,p),'utf8');
const manifest = JSON.parse(read('docs/task-manifest.json'));
const errors = [];
const check = (test,message) => {if(!test)errors.push(message);};
const expected = [
 ...Array.from({length:15},(_,i)=>`SEC-${String(i+1).padStart(2,'0')}`),
 ...Array.from({length:12},(_,i)=>`COM-${String(i+1).padStart(2,'0')}`),
 ...Array.from({length:16},(_,i)=>`LRN-${String(i+1).padStart(2,'0')}`),
 ...Array.from({length:15},(_,i)=>`ENG-${String(i+1).padStart(2,'0')}`),
 'SCOPE-01','SCOPE-02',...Array.from({length:17},(_,i)=>`ENH-${String(i+1).padStart(2,'0')}`)
];
const tasks = manifest.tasks;
const byId = new Map(tasks.map(t=>[t.id,t]));
const files = fs.readdirSync(path.join(root,'docs/tasks')).filter(p=>p.endsWith('.md'));
check(tasks.length===77 && byId.size===77,'Expected 77 unique task records');
check(files.length===77,'Expected exactly 77 task Markdown files');
check(expected.every(id=>byId.has(id)) && tasks.every(t=>expected.includes(t.id)),'Task IDs differ from 58 findings + 2 scope + 17 enhancements');
const sourceAudit = read('audit/PRODUCT_READINESS_REVIEW.md');
const findingIds = new Set([...sourceAudit.matchAll(/(?:^### |^\| )((?:SEC|COM|LRN|ENG)-\d{2})(?: —| \/)/gm)].map(m=>m[1]));
check(findingIds.size===58,'Expected 58 original finding headings/rows in preserved audit');
for(const id of findingIds) check(byId.get(id)?.originalFinding===id,'Missing exact finding owner '+id);
const sections = ['Current behavior and evidence','Intended behavior and ownership boundary','Ordered implementation changes','API, type and schema contract','Authorization, concurrency and failure handling','Migration, compatibility and rollback','Verification and acceptance tests'];
for(const t of tasks) {
 const docPath=`docs/tasks/${t.id}.md`;
 check(fs.existsSync(path.join(root,docPath)),'Missing task file '+t.id);
 if(!fs.existsSync(path.join(root,docPath))) continue;
 const body=read(docPath);
 check(['Planned','In Progress','Complete'].includes(t.status) && body.includes(`| Status | **${t.status}** |`),'Task status differs from manifest: '+t.id);
 check(['P0','P1','P2'].includes(t.priority) && /^M[0-4]$/.test(t.milestone),'Invalid task metadata '+t.id);
 for(const s of sections)check(body.includes('## '+s),'Missing section '+s+' in '+t.id);
 check(t.steps.length>=4 && t.tests.length>=3 && t.done.length>=2,'Insufficient implementation/test detail '+t.id);
 check(body.split(/\s+/).length>=500,'Task too short to carry required detail: '+t.id);
 check(t.example.length>60 && t.controls.length>100 && t.migration.length>100,'Missing concrete boundary/recovery detail '+t.id);
 check(!body.includes('[object Object]') && !body.includes('| undefined |'),'Unresolved generated content '+t.id);
 check(body.includes(t.id+'-T01') && body.includes(t.id+'-T90') && body.includes(t.id+'-T91') && body.includes(t.id+'-T92'),'Missing test dimensions '+t.id);
 for(const p of t.paths) check(fs.existsSync(path.join(root,p)),'Missing implementation entry point '+p+' in '+t.id);
 for(const dep of t.dependencies) {
  check(byId.has(dep),'Unknown dependency '+dep+' in '+t.id);
  check(dep!==t.id,'Self dependency '+t.id);
  if(byId.has(dep)) check(byId.get(dep).milestone<=t.milestone,'Later-milestone dependency '+t.id+' -> '+dep);
 }
}
let edges=0;
const state=new Map();
function visit(id,chain=[]) {
 if(state.get(id)===1){errors.push('Dependency cycle '+[...chain,id].join(' -> '));return;}
 if(state.get(id)===2)return;
 state.set(id,1);
 for(const dep of byId.get(id)?.dependencies||[]) {edges++;visit(dep,[...chain,id]);}
 state.set(id,2);
}
for(const id of byId.keys())visit(id);
const ac=manifest.acceptanceCases;
const originalAc=new Set([...read('audit/TEST_GAP_MATRIX.md').matchAll(/^\| (A\d{2}) \| P\d \|/gm)].map(m=>m[1]));
check(ac.length===42 && new Set(ac.map(c=>c.id)).size===42 && originalAc.size===42,'Expected 42 unique inherited acceptance mappings');
for(const c of ac) {
 check(originalAc.has(c.id),'Unexpected acceptance ID '+c.id);
 check(/^(Retained|Revised|Superseded)/.test(c.disposition) && c.criterion.length>40 && c.gate.length>1,'Incomplete acceptance disposition '+c.id);
 check(c.tasks.length>0 && c.tasks.every(id=>byId.has(id)),'Unowned acceptance '+c.id);
}
for(const t of tasks) check(ac.some(c=>c.tasks.includes(t.id)),'No inherited acceptance link for task '+t.id);
check(ac.find(c=>c.id==='A36')?.disposition.startsWith('Superseded'),'A36 tutor requirement must be superseded');
for(const id of ['A34','A35','A37'])check(ac.find(c=>c.id===id)?.disposition.startsWith('Revised'),'Missing uploader replacement '+id);
const archives=JSON.parse(read('docs/archive/manifest.json'));
for(const a of archives) {
 const b=fs.readFileSync(path.join(root,a.archive));
 check(crypto.createHash('sha256').update(b).digest('hex')===a.sha256,'Archived original changed: '+a.archive);
}
check(archives.length===13,'Expected 13 exact archived original guides');
const shared=['README.md','PRODUCT_SCOPE.md','TARGET_ARCHITECTURE.md','API_DATA_CONTRACTS.md','ROADMAP_BACKLOG.md','AUDIT_TRACEABILITY.md','TESTING_RELEASE_GATES.md','MIGRATION_OPERATIONS.md','TASK_TEMPLATE.md','M0_IMPLEMENTATION_STATUS.md','M0_MANUAL_TESTING.md','M0_REVIEW_RESOLUTION.md','M0_DEPENDENCY_REVIEW.md'];
for(const p of shared)check(fs.existsSync(path.join(root,'docs',p)),'Missing shared document '+p);
const activePaths=[...shared.map(p=>'docs/'+p),...files.map(p=>'docs/tasks/'+p),...archives.map(a=>a.path),'docs/archive/INDEX.md'];
let links=0,anchors=0;
function stripFences(body) {return body.replace(/^```[^\n]*\n[\s\S]*?^```\s*$/gm,'');}
function slugs(body) {
 const seen=new Map(), values=new Set();
 for(const m of stripFences(body).matchAll(/^#{1,6} (.+)$/gm)) {
  const base=m[1].trim().toLowerCase().replace(/<[^>]*>/g,'').replace(/[^\p{L}\p{N}\s_-]/gu,'').replace(/ /g,'-');
  const n=seen.get(base)||0;seen.set(base,n+1); values.add(base+(n?'-'+n:''));
 }
 return values;
}
for(const p of activePaths) {
 if(!fs.existsSync(path.join(root,p)))continue;
 const body=stripFences(read(p));
 for(const match of body.matchAll(/(?<!!)\[[^\]]+\]\((?:<([^>]+)>|([^\)]+))\)/g)) {
  let dest=(match[1]||match[2]).trim();
  if(/^(https?:|mailto:|plugin:|app:)/.test(dest))continue;
  links++;
  const [filePart,anchor]=dest.split('#');
  const target=filePart?path.resolve(path.dirname(path.join(root,p)),decodeURI(filePart)):path.join(root,p);
  check(fs.existsSync(target),'Broken local link '+p+' -> '+dest);
  if(anchor && fs.existsSync(target) && target.endsWith('.md')) {
   anchors++;
   check(slugs(fs.readFileSync(target,'utf8')).has(decodeURIComponent(anchor)),'Broken heading anchor '+p+' -> '+dest);
  }
 }
}
const contract=read('docs/API_DATA_CONTRACTS.md');
const architecture=read('docs/TARGET_ARCHITECTURE.md');
const gates=read('docs/TESTING_RELEASE_GATES.md');
for(const id of ['C01','C02','C03','C04','C05','C06','C07','C08','C09','C10']) check(contract.includes('## '+id+' —'),'Missing normative contract '+id);
for(const owner of ['ENH-02','LRN-07','COM-01','ENH-03','LRN-05','LRN-02','ENH-04','COM-06','ENG-07','ENG-03'])check(architecture.includes(`[${owner}](tasks/${owner}.md)`),'Missing owning shared concern '+owner);
for(const name of ['Paymob / Fawry','Realtime whiteboard','Code execution','Developer tokens/webhooks','Guardian portal','Certificates','Offline packs'])check(gates.includes('| '+name+' |'),'Missing API disabled matrix row '+name);
check(gates.includes('FEATURE_DISABLED') && contract.includes('410') && contract.includes('CAPABILITY_REMOVED'),'Missing staged/removal API policy');
// Only executable/planned requirements, not preserved historical quotes, are checked here.
const policy=read('docs/PRODUCT_SCOPE.md');
check(policy.includes('does **not** create educational text') && policy.includes('no AI tutor'),'Missing explicit human content scope');
const suspicious=[];
for(const p of activePaths.filter(p=>!p.includes('/tasks/') && !p.endsWith('AUDIT_TRACEABILITY.md'))) {
 for(const line of read(p).split('\n')) {
  if(/\b(must|shall|required to|implement)\b.{0,80}\b(AI generation|AI tutoring|generate educational|generated translations|AI production pipeline)\b/i.test(line) && !/\b(no|not|remove|withdrawn|outside|superseded|do not)\b/i.test(line))suspicious.push(p+': '+line);
 }
}
check(suspicious.length===0,'Review active AI requirement matches: '+suspicious.join('\n'));
const summary={tasks:tasks.length,findings:findingIds.size,acceptanceCases:ac.length,dependencyEdges:edges,localLinks:links,headingLinks:anchors,archivedOriginals:archives.length,errors:errors.length};
const statusCounts=Object.fromEntries(['Complete','In Progress','Planned'].map(s=>[s,tasks.filter(t=>t.status===s).length]));
const report=`# Documentation verification report\n\nPackage date: **2026-10-21**. Check type: static documentation integrity; no application tests, migrations or deployment executed.\n\nStatus: **${errors.length?'FAILED':'PASSED'}**.\n\n| Check | Result |\n|---|---|\n| Individual task files / status counts | ${tasks.length} / ${statusCounts.Complete} complete, ${statusCounts['In Progress']} in progress, ${statusCounts.Planned} planned |\n| Original finding owners | ${findingIds.size} / 58 |\n| Original acceptance dispositions | ${ac.length} / 42 |\n| Dependency edges / cycles | ${edges} / ${errors.some(e=>e.startsWith('Dependency cycle'))?'found':'none'} |\n| Local links / heading links checked | ${links} / ${anchors} |\n| Exact archived originals / SHA-256 | ${archives.length} / ${errors.some(e=>e.startsWith('Archived'))?'failed':'preserved'} |\n| Required task sections, source paths and tests | ${errors.some(e=>/Missing section|Missing implementation|Missing test|Insufficient/.test(e))?'failed':'passed'} |\n| Contract-owner register / disabled API matrix | ${errors.some(e=>/contract|owning|matrix|API policy/.test(e))?'failed':'passed'} |\n| Active AI requirement scan | ${suspicious.length} suspect lines |\n\n${errors.length?'## Errors\n\n'+errors.map(e=>'- '+e).join('\n'):'All 58 findings have one preserved-ID task, release disposition, dependencies and acceptance tests. All 42 acceptance cases have current criteria; A34/A35/A37 are uploader-driven replacements and A36 is superseded by removal checks. Current statuses are recorded above. Shared-owner boundaries and contract semantics were also reviewed editorially; static checks cannot prove an implementation is correct.'}\n\nReproduce: run node docs/scripts/build-docs.cjs, then node docs/scripts/validate-docs.cjs from the repository. Archived historical documents are intentionally excluded from active-link/requirement checks; their bytes are hash-verified. Static link checks do not assert that proposed endpoints already exist or that remote websites remain available.\n`;
fs.writeFileSync(path.join(root,'docs/VERIFICATION_REPORT.md'),report,'utf8');
console.log(JSON.stringify(summary,null,2));
if(errors.length){console.error(errors.join('\n'));process.exitCode=1;}
