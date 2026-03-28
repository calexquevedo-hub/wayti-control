const fs = require('fs');
const path = require('path');

const dir = path.join(__dirname, 'src/features/reports/GerencialReport/components');
const files = fs.readdirSync(dir).filter(f => f.endsWith('.tsx'));

for (const file of files) {
  const filePath = path.join(dir, file);
  let content = fs.readFileSync(filePath, 'utf-8');

  // Any remaining `${isPrinting ? ... : ...}`
  // Because we want the false branch, we capture after the colon.
  // Format: ${isPrinting ? "..." : "..."}
  content = content.replace(/\$\{isPrinting\s*\?\s*"[^"]*"\s*:\s*"([^"]*)"\}/g, '$1');
  content = content.replace(/\$\{isPrinting\s*\?\s*'[^']*'\s*:\s*'([^']*)'\}/g, '$1');

  // Format: isPrinting ? "..." : "..."
  content = content.replace(/isPrinting\s*\?\s*"[^"]*"\s*:\s*"([^"]*)"/g, '"$1"');
  content = content.replace(/isPrinting\s*\?\s*'[^']*'\s*:\s*'([^']*)'/g, "'$1'");

  // Format: isPrinting ? {...} : {...}
  content = content.replace(/isPrinting\s*\?\s*\{[^}]*\}\s*:\s*\{([^}]*)\}/g, '{$1}');

  // Format: ...(isPrinting ? { ... } : {}) -> remove entire thing
  content = content.replace(/,\s*\.\.\.\(isPrinting\s*\?\s*\{[^}]*\}\s*:\s*\{\s*\}\)/g, '');

  content = content.replace(/isPrinting\s*\?\s*'[^']*'\s*\+\s*\([^)]*\)\s*:\s*'([^']*)'\s*\+\s*\(([^)]*)\)/g, "'$1' + ($2)");

  // Specific one in Page07Risks
  // ${isPrinting ? 'bg-white border px-1 text-[7px] ' + (risk.status === "Aberto" ? 'border-red-500 text-red-700' : 'border-green-500 text-green-700') : 'text-[9px] ' + (risk.status === "Aberto" ? "bg-red-100 text-red-700" : "bg-green-100 text-green-700")}
  content = content.replace(/\$\{isPrinting\s*\?[^:]+:\s*('text-\[9px\] '\s*\+\s*\([^)]+\))\}/g, '${$1}');

  // In Page05SprintTasks:
  // ${isPrinting ? "bg-white border-orange-500 text-orange-700 text-[8px]" : "bg-orange-100 border-orange-200 text-orange-700 text-[8px]"}
  content = content.replace(/\$\{isPrinting\s*\?[^:]+:\s*"([^"]+)"\}/g, '$1');

  fs.writeFileSync(filePath, content, 'utf-8');
}
console.log('done replacing leftovers');
