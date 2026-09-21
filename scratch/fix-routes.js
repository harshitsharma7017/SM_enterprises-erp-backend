import fs from 'fs';
const file = 'src/modules/export-document/export-document.routes.js';
let content = fs.readFileSync(file, 'utf8');
content = content.replace(/\/:document\/packing-list\/\{\:variant\}\?/g, '/:document/packing-list/:variant');
fs.writeFileSync(file, content);
