import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const srcDir = path.join(__dirname, '..', 'src');

const moduleName = process.argv[2];

if (!moduleName) {
  console.error('❌ Please provide a module name. Example: npm run generate:module -- buyer');
  process.exit(1);
}

// Normalize to kebab-case
const kebabName = moduleName.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/(^-|-$)/g, '');

const filesToCreate = [
  { dir: 'controllers', suffix: 'controller' },
  { dir: 'services', suffix: 'service' },
  { dir: 'repositories', suffix: 'repository' },
  { dir: 'routes', suffix: 'routes' },
  { dir: 'validators', suffix: 'validator' },
  { dir: 'models', suffix: 'model' }
];

console.log(`\\nGenerating module: ${kebabName}\\n`);

let createdCount = 0;

filesToCreate.forEach(({ dir, suffix }) => {
  const dirPath = path.join(srcDir, dir);
  const fileName = `${kebabName}.${suffix}.js`;
  const filePath = path.join(dirPath, fileName);

  if (!fs.existsSync(dirPath)) {
    fs.mkdirSync(dirPath, { recursive: true });
  }

  if (fs.existsSync(filePath)) {
    console.log(`⚠️  Skipped: ${fileName} already exists.`);
  } else {
    fs.writeFileSync(filePath, `// ${kebabName} ${suffix}\\n`);
    console.log(`✅ Created: src/${dir}/${fileName}`);
    createdCount++;
  }
});

console.log(`\\n✨ Module generation complete. Created ${createdCount} files.\\n`);
