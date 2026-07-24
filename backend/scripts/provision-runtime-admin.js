'use strict';

const bcrypt = require('bcryptjs');
const { pool } = require('../db');

async function main() {
  const email = String(process.env.PROVISION_ADMIN_EMAIL || '').trim().toLowerCase();
  const password = process.env.PROVISION_ADMIN_PASSWORD || '';
  const tenantId = String(process.env.GOVERNANCE_TENANT_ID || process.env.TENANT_ID || 'runtime-tenant').trim();
  if (!email.includes('@') || password.length < 12 || !tenantId) throw new Error('Runtime admin email, 12+ character password, and tenant are required');
  const encoded = await bcrypt.hash(password, 12);
  await pool.query(
    `INSERT INTO users (email, password, name, role, tenant_id)
     VALUES ($1, $2, 'Runtime Administrator', 'admin', $3)
     ON CONFLICT (email) DO UPDATE SET password=EXCLUDED.password, name=EXCLUDED.name, role=EXCLUDED.role, tenant_id=EXCLUDED.tenant_id`,
    [email, encoded, tenantId]
  );
  console.log('Runtime administrator provisioned.');
}

main().then(() => pool.end()).catch(async (error) => {
  console.error(error.message);
  await pool.end().catch(() => {});
  process.exitCode = 1;
});
