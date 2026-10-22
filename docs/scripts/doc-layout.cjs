const path = require('node:path').posix;

const retiredRootDocs = {
  'task.md': 'docs/ROADMAP_BACKLOG.md',
  'implementation_plan.md': 'docs/NEXT_STEPS.md',
  'Educational_Platform_Requirements_and_Test_Plan.md': 'docs/TESTING_RELEASE_GATES.md',
  'Educational_Platform_System_Design_Document.md': 'docs/TARGET_ARCHITECTURE.md',
  'project_overview_and_usage_guide.md': 'docs/README.md',
  'manual_testing_guide.md': 'docs/M0_MANUAL_TESTING.md',
  'REQUIREMENTS_COVERAGE.md': 'docs/AUDIT_TRACEABILITY.md',
  'teacher.md': 'docs/PRODUCT_SCOPE.md',
  'DEEP_DIVE_ANALYSIS_AND_ENHANCEMENTS.md': 'docs/ROADMAP_BACKLOG.md',
  'LEARNHOUSE_DEEP_DIVE_ANALYSIS.md': 'docs/TARGET_ARCHITECTURE.md',
};

const taskDocument = t => t.status === 'Complete'
  ? `docs/archive/completed/M0/${t.id}.md` : `docs/tasks/${t.id}.md`;
const historicalDocMoves = {
  'docs/M0_IMPLEMENTATION_STATUS.md': 'docs/archive/reviews/M0_IMPLEMENTATION_STATUS.md',
  'docs/M0_REVIEW_RESOLUTION.md': 'docs/archive/reviews/M0_REVIEW_RESOLUTION.md',
  'docs/M0_REVIEW_ROUND_2.md': 'docs/archive/reviews/M0_REVIEW_ROUND_2.md',
};

function rewriteLinks(body, from, to, tasks) {
  const targets = new Map(tasks.map(t => [`docs/tasks/${t.id}.md`, taskDocument(t)]));
  return body.replace(/(?<!!)\[([^\]]+)\]\((?:<([^>]+)>|([^\)]+))\)/g, (original, label, angled, bare) => {
    const dest = (angled || bare).trim();
    if (/^(?:[a-z]+:|\/)/i.test(dest)) return original;
    const [file, anchor] = dest.split('#');
    const source = file ? path.normalize(path.join(path.dirname(from), file)) : from;
    const target = targets.get(source) || historicalDocMoves[source] || retiredRootDocs[source] || source;
    const relative = source === from && !file && from === to ? '' : path.relative(path.dirname(to), target);
    const rewritten = relative + (anchor ? `#${anchor}` : '');
    return `[${label}](${angled || rewritten.includes(' ') ? `<${rewritten}>` : rewritten})`;
  });
}

module.exports = { retiredRootDocs, historicalDocMoves, taskDocument, rewriteLinks };
