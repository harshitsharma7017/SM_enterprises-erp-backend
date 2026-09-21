const fs = require('fs');

const modules = [
  'category', 'po-format', 'product', 'buyer', 'supplier', 'jobber', 'agent', 
  'fob-value', 'markup', 'inquiry', 'order-confirmation', 'purchase-order', 
  'inward-entry', 'packing', 'export-document', 'purchase-bill', 'debit-note', 
  'payment', 'foreign-payment', 'agent-commission', 'outstanding', 'report', 
  'user', 'role', 'permission', 'company-profile'
];

let permissions = [];
modules.forEach(mod => {
  permissions.push(`${mod}.view`);
  permissions.push(`${mod}.create`);
  permissions.push(`${mod}.edit`);
  permissions.push(`${mod}.delete`);
});

const extended = [
  'inquiry.approve', 'inquiry.export',
  'order-confirmation.approve', 'order-confirmation.export',
  'purchase-order.approve', 'purchase-order.export',
  'export-document.generate', 'export-document.export',
  'debit-note.approve',
  'payment.approve',
  'foreign-payment.approve',
  'inward-entry.approve',
  'report.export',
  'permission.sync'
];

permissions.push(...extended);
permissions = [...new Set(permissions)]; // ensure unique

console.log('Total Generated Permissions:', permissions.length);
