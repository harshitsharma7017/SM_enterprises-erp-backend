export async function up(connection) {
  console.log('--- Executing Migration 012: Removing phantom timestamps ---');
  await connection.query('ALTER TABLE \`buyer_shipment_method\` DROP COLUMN \`created_at\`;');
  await connection.query('ALTER TABLE \`buyer_shipment_method\` DROP COLUMN \`updated_at\`;');
}

export async function down(connection) {
  console.log('Not implemented.');
}
