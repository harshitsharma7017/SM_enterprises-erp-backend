const fs = require('fs');

const text = fs.readFileSync('docs/exact-permissions.md', 'utf-8');

// 1. Extract 108 permissions
const permRegex = /^\d+\.\s+\`([a-z0-9\-\.]+)\`/gm;
const allPermissions = [];
let m;
while ((m = permRegex.exec(text)) !== null) {
  allPermissions.push(m[1]);
}

if (allPermissions.length !== 108) {
  throw new Error(`Expected 108 permissions, got ${allPermissions.length}`);
}

// Count standard vs extended
const standardActions = ['view', 'create', 'edit', 'delete'];
let standardCount = 0;
let extendedCount = 0;
allPermissions.forEach(p => {
  const action = p.split('.')[1];
  if (standardActions.includes(action)) standardCount++;
  else extendedCount++;
});

if (standardCount !== 93) throw new Error(`Expected 93 standard permissions, got ${standardCount}`);
if (extendedCount !== 15) throw new Error(`Expected 15 extended permissions, got ${extendedCount}`);
if (!allPermissions.includes('outstanding.export')) throw new Error('outstanding.export missing');

// 2. Extract roles mapping
// The role block starts after "## Role Mapping" and ends with "## Source"
const mappingBlockMatch = text.match(/## Role Mapping[\s\S]+?## Source/);
if (!mappingBlockMatch) throw new Error('Could not find Role Mapping block');
const mappingBlock = mappingBlockMatch[0];

const roleMappings = {};
let totalMappings = 0;

// Match: - **Role Name**: \n   - `perm1`, `perm2`...
const roleRegex = /- \*\*(.+?)\*\*:\s*\n\s+- (.*)/g;
let match;
while ((match = roleRegex.exec(mappingBlock)) !== null) {
  const roleName = match[1].trim();
  const permsString = match[2].trim();
  
  let rolePerms = [];
  if (permsString.includes('All 108 permissions')) {
    rolePerms = [...allPermissions];
  } else {
    const items = permsString.match(/\`([a-z0-9\-\.]+)\`/g);
    if (!items) throw new Error(`Could not parse role permissions for ${roleName}`);
    rolePerms = items.map(i => i.replace(/\`/g, ''));
  }
  
  // validate they all exist
  rolePerms.forEach(p => {
    if (!allPermissions.includes(p)) throw new Error(`Role ${roleName} references nonexistent permission: ${p}`);
  });
  
  roleMappings[roleName] = rolePerms;
  totalMappings += rolePerms.length;
}

const roles = Object.keys(roleMappings);
if (roles.length !== 8) throw new Error(`Expected 8 roles, got ${roles.length}`);
if (totalMappings !== 322) throw new Error(`Expected 322 role mappings, got ${totalMappings}`);

const seedData = {
  roles,
  permissions: allPermissions,
  mappings: roleMappings
};

// Ensure src/config exists
if (!fs.existsSync('src/config')) {
  fs.mkdirSync('src/config', { recursive: true });
}

fs.writeFileSync('src/config/rbac-seed.json', JSON.stringify(seedData, null, 2));

console.log('Validation successful!');
console.log(`- Roles: ${roles.length}`);
console.log(`- Unique Permissions: ${allPermissions.length}`);
console.log(`- Standard Permissions: ${standardCount}`);
console.log(`- Extended Permissions: ${extendedCount}`);
console.log(`- Role-Permission Mappings: ${totalMappings}`);
console.log(`- outstanding.export exists: true`);
console.log('Wrote src/config/rbac-seed.json');
