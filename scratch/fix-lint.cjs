const fs = require('fs');
const path = require('path');

const frontendPath = path.resolve(__dirname, '../../garment-erp-frontend');
const authPath = path.join(frontendPath, 'hooks/useAuth.js');
let authContent = fs.readFileSync(authPath, 'utf8');

// The best way to fix the synchronous set state error is to wrap the remaining instances
authContent = authContent.replace(/if \(mounted\) setLoading\(false\);/g, 'setTimeout(() => { if (mounted) setLoading(false); }, 0);');

fs.writeFileSync(authPath, authContent, 'utf8');
console.log('Fixed useAuth hook lint (all instances)');
