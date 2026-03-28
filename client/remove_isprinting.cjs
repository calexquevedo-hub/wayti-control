const fs = require('fs');
const path = require('path');

const dir = path.join(__dirname, 'src/features/reports/GerencialReport/components');
const files = fs.readdirSync(dir).filter(f => f.endsWith('.tsx'));

for (const file of files) {
  const filePath = path.join(dir, file);
  let content = fs.readFileSync(filePath, 'utf-8');

  // 1. Remove optional isPrinting from Props
  content = content.replace(/\s*isPrinting\?:\s*boolean;\s*/g, '\n');

  // 2. Remove isPrinting from destructured props
  content = content.replace(/\{\s*data\s*,\s*isPrinting\s*\}/g, '{ data }');
  content = content.replace(/\{\s*\.\.\.data\s*,\s*isPrinting\s*\}/g, '{ ...data }');
  
  // Custom case for Page06SprintCharts or others with nested destructuring
  content = content.replace(/,\s*isPrinting\s*/g, '');

  // 3. Replace ternary expressions in classNames / strings
  // Example: isPrinting ? "bg-white" : "bg-blue"
  // We want to KEEP the FALSE branch (the preview version).
  
  // Replace: ${isPrinting ? 'something' : 'other'} -> ${'other'} -> other
  content = content.replace(/\$\{isPrinting\s*\?\s*'[^']*'\s*:\s*'([^']*)'\}/g, '$1');
  content = content.replace(/\$\{isPrinting\s*\?\s*"[^"]*"\s*:\s*"([^"]*)"\}/g, '$1');
  
  // Replace: isPrinting ? "something" : "other"
  content = content.replace(/isPrinting\s*\?\s*"[^"]*"\s*:\s*"([^"]*)"/g, '"$1"');
  content = content.replace(/isPrinting\s*\?\s*'[^']*'\s*:\s*'([^']*)'/g, "'$1'");
  
  // Replace: style={isPrinting ? { ... } : {}} -> style={{}} -> empty style object (or remove it)
  content = content.replace(/style=\{isPrinting\s*\?\s*\{[^}]*\}\s*:\s*\{([^}]*)\}\}/g, 'style={{$1}}');
  
  fs.writeFileSync(filePath, content, 'utf-8');
}
console.log('done replacing ternaries');
