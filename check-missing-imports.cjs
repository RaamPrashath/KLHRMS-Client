const fs = require("fs");
const path = require("path");

const root = process.cwd();
const pkg = JSON.parse(fs.readFileSync("package.json", "utf8"));

const declared = new Set([
  ...Object.keys(pkg.dependencies || {}),
  ...Object.keys(pkg.devDependencies || {}),
  ...Object.keys(pkg.peerDependencies || {}),
  ...Object.keys(pkg.optionalDependencies || {})
]);

const files = [];

function walk(d) {
  for (const e of fs.readdirSync(d, { withFileTypes: true })) {
    const p = path.join(d, e.name);
    if (e.isDirectory()) {
      if (!["node_modules", ".next", ".rush", "dist", "build", "coverage"].includes(e.name)) walk(p);
    } else if (/\.(ts|tsx|js|jsx|mjs|cjs)$/.test(e.name)) {
      files.push(p);
    }
  }
}

walk(path.join(root, "src"));

const imports = new Set();
const re = /(?:import\s+(?:type\s+)?(?:[^'";]+?\s+from\s+)?|export\s+(?:type\s+)?[^'";]+?\s+from\s+|import\s*\()\s*['"]([^'"]+)['"]/g;

for (const f of files) {
  const s = fs.readFileSync(f, "utf8");
  let m;
  while ((m = re.exec(s))) {
    const spec = m[1];
    if (spec.startsWith(".") || spec.startsWith("@/") || spec.startsWith("#") || spec.startsWith("node:")) continue;
    const name = spec.startsWith("@") ? spec.split("/").slice(0, 2).join("/") : spec.split("/")[0];
    imports.add(name);
  }
}

const missing = [...imports].filter(x => !declared.has(x)).sort();
console.log(missing.join("\n") || "No missing external imports found.");
