const { pool } = require('./index');
const bcrypt = require('bcryptjs');
const demoPassword = process.env.DEMO_PASSWORD;
if (process.env.CONFIRM_DEMO_SEED !== 'YES' || process.env.NODE_ENV === 'production' || !demoPassword || demoPassword.length < 12) {
  throw new Error('Demo seed requires CONFIRM_DEMO_SEED=YES, non-production NODE_ENV, and DEMO_PASSWORD of at least 12 characters');
}

async function seed() {
  const client = await pool.connect();
  try {
    await client.query('BEGIN');

    // Drop existing tables
    await client.query(`
      DROP TABLE IF EXISTS audit_log CASCADE;
      DROP TABLE IF EXISTS contacts CASCADE;
      DROP TABLE IF EXISTS aging_records CASCADE;
      DROP TABLE IF EXISTS discounts CASCADE;
      DROP TABLE IF EXISTS cash_applications CASCADE;
      DROP TABLE IF EXISTS dunning_records CASCADE;
      DROP TABLE IF EXISTS payments CASCADE;
      DROP TABLE IF EXISTS invoices CASCADE;
      DROP TABLE IF EXISTS users CASCADE;
    `);

    // Create users table
    await client.query(`
      CREATE TABLE users (
        id SERIAL PRIMARY KEY,
        email VARCHAR(255) UNIQUE NOT NULL,
        password VARCHAR(255) NOT NULL,
        name VARCHAR(255) NOT NULL,
        role VARCHAR(50) DEFAULT 'user',
        created_at TIMESTAMP DEFAULT NOW()
      )
    `);

    // Create invoices table
    await client.query(`
      CREATE TABLE invoices (
        id SERIAL PRIMARY KEY,
        invoice_number VARCHAR(50) UNIQUE NOT NULL,
        vendor_name VARCHAR(255) NOT NULL,
        amount DECIMAL(12,2) NOT NULL,
        po_number VARCHAR(50),
        po_amount DECIMAL(12,2),
        match_status VARCHAR(50) DEFAULT 'pending',
        match_score DECIMAL(5,2),
        invoice_date DATE NOT NULL,
        due_date DATE NOT NULL,
        category VARCHAR(100),
        description TEXT,
        ai_notes TEXT,
        created_at TIMESTAMP DEFAULT NOW(),
        updated_at TIMESTAMP DEFAULT NOW()
      )
    `);

    // Create payments table
    await client.query(`
      CREATE TABLE payments (
        id SERIAL PRIMARY KEY,
        payment_ref VARCHAR(50) UNIQUE NOT NULL,
        payer_name VARCHAR(255) NOT NULL,
        amount DECIMAL(12,2) NOT NULL,
        payment_method VARCHAR(50),
        bank_reference VARCHAR(100),
        invoice_number VARCHAR(50),
        reconciliation_status VARCHAR(50) DEFAULT 'unreconciled',
        payment_date DATE NOT NULL,
        bank_statement_date DATE,
        difference_amount DECIMAL(12,2) DEFAULT 0,
        notes TEXT,
        ai_notes TEXT,
        created_at TIMESTAMP DEFAULT NOW(),
        updated_at TIMESTAMP DEFAULT NOW()
      )
    `);

    // Create dunning_records table
    await client.query(`
      CREATE TABLE dunning_records (
        id SERIAL PRIMARY KEY,
        customer_name VARCHAR(255) NOT NULL,
        customer_email VARCHAR(255),
        invoice_number VARCHAR(50) NOT NULL,
        amount_due DECIMAL(12,2) NOT NULL,
        days_overdue INTEGER NOT NULL,
        dunning_level INTEGER DEFAULT 1,
        last_contact_date DATE,
        next_action_date DATE,
        status VARCHAR(50) DEFAULT 'active',
        contact_attempts INTEGER DEFAULT 0,
        risk_score VARCHAR(20),
        notes TEXT,
        ai_recommendation TEXT,
        created_at TIMESTAMP DEFAULT NOW(),
        updated_at TIMESTAMP DEFAULT NOW()
      )
    `);

    // Create cash_applications table
    await client.query(`
      CREATE TABLE cash_applications (
        id SERIAL PRIMARY KEY,
        receipt_ref VARCHAR(50) UNIQUE NOT NULL,
        customer_name VARCHAR(255) NOT NULL,
        received_amount DECIMAL(12,2) NOT NULL,
        applied_amount DECIMAL(12,2) DEFAULT 0,
        unapplied_amount DECIMAL(12,2),
        invoice_references TEXT,
        application_status VARCHAR(50) DEFAULT 'unapplied',
        receipt_date DATE NOT NULL,
        bank_account VARCHAR(100),
        payment_method VARCHAR(50),
        remittance_info TEXT,
        ai_suggestion TEXT,
        created_at TIMESTAMP DEFAULT NOW(),
        updated_at TIMESTAMP DEFAULT NOW()
      )
    `);

    // Create discounts table
    await client.query(`
      CREATE TABLE discounts (
        id SERIAL PRIMARY KEY,
        invoice_number VARCHAR(50) NOT NULL,
        vendor_name VARCHAR(255) NOT NULL,
        invoice_amount DECIMAL(12,2) NOT NULL,
        discount_terms VARCHAR(100),
        discount_percent DECIMAL(5,2),
        discount_amount DECIMAL(12,2),
        discount_deadline DATE,
        payment_status VARCHAR(50) DEFAULT 'unpaid',
        capture_status VARCHAR(50) DEFAULT 'available',
        potential_savings DECIMAL(12,2),
        priority VARCHAR(20),
        ai_recommendation TEXT,
        created_at TIMESTAMP DEFAULT NOW(),
        updated_at TIMESTAMP DEFAULT NOW()
      )
    `);

    // Create aging_records table
    await client.query(`
      CREATE TABLE aging_records (
        id SERIAL PRIMARY KEY,
        entity_name VARCHAR(255) NOT NULL,
        entity_type VARCHAR(20) NOT NULL,
        total_outstanding DECIMAL(12,2) NOT NULL,
        current_amount DECIMAL(12,2) DEFAULT 0,
        days_1_30 DECIMAL(12,2) DEFAULT 0,
        days_31_60 DECIMAL(12,2) DEFAULT 0,
        days_61_90 DECIMAL(12,2) DEFAULT 0,
        days_over_90 DECIMAL(12,2) DEFAULT 0,
        credit_limit DECIMAL(12,2),
        risk_rating VARCHAR(20),
        last_payment_date DATE,
        avg_days_to_pay INTEGER,
        ai_analysis TEXT,
        created_at TIMESTAMP DEFAULT NOW(),
        updated_at TIMESTAMP DEFAULT NOW()
      )
    `);

    // Create contacts table
    await client.query(`
      CREATE TABLE contacts (
        id SERIAL PRIMARY KEY,
        name VARCHAR(255) NOT NULL,
        type VARCHAR(20) NOT NULL DEFAULT 'customer',
        email VARCHAR(255),
        phone VARCHAR(50),
        company VARCHAR(255),
        address TEXT,
        payment_terms VARCHAR(100),
        credit_limit DECIMAL(12,2),
        status VARCHAR(50) DEFAULT 'active',
        notes TEXT,
        created_at TIMESTAMP DEFAULT NOW(),
        updated_at TIMESTAMP DEFAULT NOW()
      )
    `);

    // Create audit_log table
    await client.query(`
      CREATE TABLE audit_log (
        id SERIAL PRIMARY KEY,
        user_name VARCHAR(255),
        user_email VARCHAR(255),
        module VARCHAR(100) NOT NULL,
        action VARCHAR(50) NOT NULL,
        record_id INTEGER,
        details TEXT,
        created_at TIMESTAMP DEFAULT NOW()
      )
    `);

    // Seed demo user
    const hashedPassword = await bcrypt.hash(demoPassword, 10);
    await client.query(`
      INSERT INTO users (email, password, name, role) VALUES
      ('admin@apar.com', $1, 'Admin User', 'admin'),
      ('demo@apar.com', $1, 'Demo User', 'user')
    `, [hashedPassword]);

    // Seed invoices (15+ items)
    await client.query(`
      INSERT INTO invoices (invoice_number, vendor_name, amount, po_number, po_amount, match_status, match_score, invoice_date, due_date, category, description) VALUES
      ('INV-2024-001', 'Acme Corp', 15250.00, 'PO-4501', 15250.00, 'matched', 100.00, '2024-01-15', '2024-02-15', 'Office Supplies', 'Bulk office supply order Q1'),
      ('INV-2024-002', 'TechParts Inc', 8750.50, 'PO-4502', 8900.00, 'partial_match', 85.50, '2024-01-20', '2024-02-20', 'IT Equipment', 'Server components batch 12'),
      ('INV-2024-003', 'GlobalShip LLC', 3200.00, 'PO-4503', 3200.00, 'matched', 100.00, '2024-02-01', '2024-03-01', 'Shipping', 'International freight Q1'),
      ('INV-2024-004', 'CloudServe Pro', 12500.00, NULL, NULL, 'unmatched', 0.00, '2024-02-05', '2024-03-05', 'Cloud Services', 'AWS hosting Feb 2024'),
      ('INV-2024-005', 'PaperWorld', 1875.25, 'PO-4505', 1875.25, 'matched', 100.00, '2024-02-10', '2024-03-10', 'Office Supplies', 'Printer paper and toner'),
      ('INV-2024-006', 'SafeGuard Security', 4500.00, 'PO-4506', 4200.00, 'partial_match', 72.30, '2024-02-15', '2024-03-15', 'Security', 'Monthly security services'),
      ('INV-2024-007', 'CleanPro Services', 2800.00, 'PO-4507', 2800.00, 'matched', 100.00, '2024-02-20', '2024-03-20', 'Facilities', 'Office cleaning February'),
      ('INV-2024-008', 'DataLink Systems', 22000.00, 'PO-4508', 22000.00, 'matched', 100.00, '2024-03-01', '2024-04-01', 'IT Services', 'Network infrastructure upgrade'),
      ('INV-2024-009', 'FreshCatering Co', 1650.00, NULL, NULL, 'unmatched', 0.00, '2024-03-05', '2024-04-05', 'Catering', 'Staff lunch program March'),
      ('INV-2024-010', 'LegalEagle LLP', 7500.00, 'PO-4510', 7800.00, 'partial_match', 68.20, '2024-03-10', '2024-04-10', 'Legal', 'Contract review services'),
      ('INV-2024-011', 'PowerGrid Electric', 3100.00, 'PO-4511', 3100.00, 'matched', 100.00, '2024-03-15', '2024-04-15', 'Utilities', 'Electricity March 2024'),
      ('INV-2024-012', 'MarketBuzz Agency', 18500.00, 'PO-4512', 18000.00, 'partial_match', 78.40, '2024-03-20', '2024-04-20', 'Marketing', 'Q1 marketing campaign'),
      ('INV-2024-013', 'RentSpace Properties', 45000.00, 'PO-4513', 45000.00, 'matched', 100.00, '2024-04-01', '2024-05-01', 'Real Estate', 'Office rent April 2024'),
      ('INV-2024-014', 'TravelWise', 6200.00, NULL, NULL, 'unmatched', 0.00, '2024-04-05', '2024-05-05', 'Travel', 'Corporate travel expenses Q1'),
      ('INV-2024-015', 'HealthFirst Insurance', 28000.00, 'PO-4515', 28000.00, 'matched', 100.00, '2024-04-10', '2024-05-10', 'Insurance', 'Employee health insurance Q2'),
      ('INV-2024-016', 'SoftLicense Corp', 9800.00, 'PO-4516', 9500.00, 'partial_match', 82.10, '2024-04-15', '2024-05-15', 'Software', 'Annual software licenses'),
      ('INV-2024-017', 'QuickFix Maintenance', 2100.00, 'PO-4517', 2100.00, 'matched', 100.00, '2024-04-20', '2024-05-20', 'Maintenance', 'HVAC maintenance April')
    `);

    // Seed payments (15+ items)
    await client.query(`
      INSERT INTO payments (payment_ref, payer_name, amount, payment_method, bank_reference, invoice_number, reconciliation_status, payment_date, bank_statement_date, difference_amount, notes) VALUES
      ('PAY-2024-001', 'Stellar Industries', 12500.00, 'Wire Transfer', 'BNK-78901', 'AR-INV-001', 'reconciled', '2024-01-20', '2024-01-21', 0.00, 'Full payment received'),
      ('PAY-2024-002', 'Nova Solutions', 8750.00, 'ACH', 'BNK-78902', 'AR-INV-002', 'partial', '2024-01-25', '2024-01-26', -250.00, 'Short payment - dispute pending'),
      ('PAY-2024-003', 'Quantum Dynamics', 25000.00, 'Wire Transfer', 'BNK-78903', 'AR-INV-003', 'reconciled', '2024-02-01', '2024-02-02', 0.00, 'Payment for project milestone'),
      ('PAY-2024-004', 'Apex Manufacturing', 5600.00, 'Check', 'BNK-78904', NULL, 'unreconciled', '2024-02-05', '2024-02-07', 5600.00, 'No matching invoice found'),
      ('PAY-2024-005', 'BlueWave Tech', 18200.00, 'ACH', 'BNK-78905', 'AR-INV-005', 'reconciled', '2024-02-10', '2024-02-11', 0.00, 'Quarterly service payment'),
      ('PAY-2024-006', 'Horizon Partners', 3400.00, 'Wire Transfer', 'BNK-78906', 'AR-INV-006', 'partial', '2024-02-15', '2024-02-16', -600.00, 'Deducted for returns'),
      ('PAY-2024-007', 'Summit Corp', 42000.00, 'Wire Transfer', 'BNK-78907', 'AR-INV-007', 'reconciled', '2024-02-20', '2024-02-21', 0.00, 'Annual contract payment'),
      ('PAY-2024-008', 'Delta Solutions', 7800.00, 'ACH', 'BNK-78908', NULL, 'unreconciled', '2024-03-01', '2024-03-03', 7800.00, 'Unidentified payment'),
      ('PAY-2024-009', 'EcoGreen Ltd', 15750.00, 'Check', 'BNK-78909', 'AR-INV-009', 'reconciled', '2024-03-05', '2024-03-08', 0.00, 'Bulk order payment'),
      ('PAY-2024-010', 'PrimeLogistics', 9100.00, 'Wire Transfer', 'BNK-78910', 'AR-INV-010', 'partial', '2024-03-10', '2024-03-11', -400.00, 'Partial - balance pending'),
      ('PAY-2024-011', 'Atlas Group', 31500.00, 'ACH', 'BNK-78911', 'AR-INV-011', 'reconciled', '2024-03-15', '2024-03-16', 0.00, 'Project completion payment'),
      ('PAY-2024-012', 'Zenith Corp', 6250.00, 'Wire Transfer', 'BNK-78912', NULL, 'unreconciled', '2024-03-20', '2024-03-22', 6250.00, 'Payment reference unclear'),
      ('PAY-2024-013', 'Falcon Enterprises', 19800.00, 'ACH', 'BNK-78913', 'AR-INV-013', 'reconciled', '2024-04-01', '2024-04-02', 0.00, 'Monthly retainer Q2'),
      ('PAY-2024-014', 'Titan Industries', 4500.00, 'Check', 'BNK-78914', 'AR-INV-014', 'partial', '2024-04-05', '2024-04-08', -1500.00, 'Disputed items deducted'),
      ('PAY-2024-015', 'Vanguard Systems', 27300.00, 'Wire Transfer', 'BNK-78915', 'AR-INV-015', 'reconciled', '2024-04-10', '2024-04-11', 0.00, 'Hardware purchase payment'),
      ('PAY-2024-016', 'Orion Group', 11200.00, 'ACH', 'BNK-78916', 'AR-INV-016', 'unreconciled', '2024-04-15', NULL, 11200.00, 'Awaiting bank statement')
    `);

    // Seed dunning records (15+ items)
    await client.query(`
      INSERT INTO dunning_records (customer_name, customer_email, invoice_number, amount_due, days_overdue, dunning_level, last_contact_date, next_action_date, status, contact_attempts, risk_score, notes) VALUES
      ('Redstone Corp', 'ar@redstone.com', 'AR-INV-101', 15000.00, 45, 2, '2024-03-01', '2024-03-15', 'active', 3, 'medium', 'Customer requested extension'),
      ('Pinnacle Ltd', 'billing@pinnacle.com', 'AR-INV-102', 8500.00, 90, 3, '2024-02-15', '2024-03-01', 'escalated', 5, 'high', 'Sent to collections review'),
      ('Crescent Inc', 'ap@crescent.com', 'AR-INV-103', 3200.00, 15, 1, '2024-03-10', '2024-03-25', 'active', 1, 'low', 'First reminder sent'),
      ('Obsidian Tech', 'finance@obsidian.com', 'AR-INV-104', 22000.00, 60, 2, '2024-02-28', '2024-03-10', 'active', 4, 'high', 'Promises payment by month end'),
      ('Sapphire Group', 'ar@sapphire.com', 'AR-INV-105', 5700.00, 30, 1, '2024-03-05', '2024-03-20', 'active', 2, 'medium', 'Awaiting PO approval'),
      ('Emerald Solutions', 'billing@emerald.com', 'AR-INV-106', 41000.00, 120, 3, '2024-01-20', '2024-02-05', 'legal', 8, 'critical', 'Legal action initiated'),
      ('Cobalt Industries', 'finance@cobalt.com', 'AR-INV-107', 6800.00, 25, 1, '2024-03-08', '2024-03-23', 'active', 1, 'low', 'Invoice under internal review'),
      ('Amber Corp', 'ap@amber.com', 'AR-INV-108', 12300.00, 75, 3, '2024-02-10', '2024-02-25', 'escalated', 6, 'high', 'Partial payment received'),
      ('Ivory Partners', 'billing@ivory.com', 'AR-INV-109', 9100.00, 35, 2, '2024-03-02', '2024-03-17', 'active', 3, 'medium', 'Dispute on service quality'),
      ('Slate Digital', 'finance@slate.com', 'AR-INV-110', 2800.00, 10, 1, '2024-03-12', '2024-03-27', 'active', 1, 'low', 'Payment in processing'),
      ('Onyx Group', 'ar@onyx.com', 'AR-INV-111', 35500.00, 95, 3, '2024-02-01', '2024-02-15', 'escalated', 7, 'critical', 'Customer financial difficulties'),
      ('Pearl Systems', 'billing@pearl.com', 'AR-INV-112', 7400.00, 50, 2, '2024-02-25', '2024-03-10', 'active', 4, 'medium', 'Payment plan requested'),
      ('Ruby Tech', 'ap@ruby.com', 'AR-INV-113', 18900.00, 40, 2, '2024-03-01', '2024-03-15', 'active', 3, 'medium', 'Waiting for budget approval'),
      ('Jade Enterprises', 'finance@jade.com', 'AR-INV-114', 4200.00, 20, 1, '2024-03-09', '2024-03-24', 'active', 2, 'low', 'Check in mail per customer'),
      ('Topaz LLC', 'billing@topaz.com', 'AR-INV-115', 28000.00, 110, 3, '2024-01-25', '2024-02-10', 'legal', 9, 'critical', 'Demand letter sent'),
      ('Coral Holdings', 'ar@coral.com', 'AR-INV-116', 5100.00, 55, 2, '2024-02-22', '2024-03-08', 'active', 4, 'medium', 'Contact person changed')
    `);

    // Seed cash applications (15+ items)
    await client.query(`
      INSERT INTO cash_applications (receipt_ref, customer_name, received_amount, applied_amount, unapplied_amount, invoice_references, application_status, receipt_date, bank_account, payment_method, remittance_info) VALUES
      ('REC-2024-001', 'Stellar Industries', 25000.00, 25000.00, 0.00, 'AR-INV-001, AR-INV-020', 'fully_applied', '2024-01-15', 'Chase-001', 'Wire Transfer', 'Ref: Jan payment batch'),
      ('REC-2024-002', 'Nova Solutions', 12000.00, 8750.00, 3250.00, 'AR-INV-002', 'partially_applied', '2024-01-20', 'Chase-001', 'ACH', 'Partial apply - overpayment'),
      ('REC-2024-003', 'Unknown Sender', 5600.00, 0.00, 5600.00, NULL, 'unapplied', '2024-02-01', 'BOA-002', 'Wire Transfer', 'No remittance details'),
      ('REC-2024-004', 'Quantum Dynamics', 42000.00, 42000.00, 0.00, 'AR-INV-003, AR-INV-021', 'fully_applied', '2024-02-05', 'Chase-001', 'Wire Transfer', 'Project Alpha milestone 3'),
      ('REC-2024-005', 'Apex Manufacturing', 18500.00, 15000.00, 3500.00, 'AR-INV-004', 'partially_applied', '2024-02-10', 'BOA-002', 'Check', 'Check #4521 - partial'),
      ('REC-2024-006', 'BlueWave Tech', 31200.00, 31200.00, 0.00, 'AR-INV-005, AR-INV-022, AR-INV-023', 'fully_applied', '2024-02-15', 'Chase-001', 'ACH', 'Q1 batch payment'),
      ('REC-2024-007', 'Unidentified', 8900.00, 0.00, 8900.00, NULL, 'unapplied', '2024-02-20', 'Wells-003', 'Wire Transfer', 'Reference: 7789XY'),
      ('REC-2024-008', 'Horizon Partners', 9400.00, 9400.00, 0.00, 'AR-INV-006', 'fully_applied', '2024-03-01', 'Chase-001', 'ACH', 'Monthly retainer Feb'),
      ('REC-2024-009', 'Summit Corp', 55000.00, 42000.00, 13000.00, 'AR-INV-007', 'partially_applied', '2024-03-05', 'BOA-002', 'Wire Transfer', 'Contract payment - excess'),
      ('REC-2024-010', 'Delta Solutions', 7800.00, 0.00, 7800.00, NULL, 'unapplied', '2024-03-10', 'Wells-003', 'ACH', 'No invoice reference provided'),
      ('REC-2024-011', 'EcoGreen Ltd', 22750.00, 22750.00, 0.00, 'AR-INV-009, AR-INV-024', 'fully_applied', '2024-03-15', 'Chase-001', 'Check', 'Bulk order settlement'),
      ('REC-2024-012', 'PrimeLogistics', 14600.00, 9100.00, 5500.00, 'AR-INV-010', 'partially_applied', '2024-03-20', 'BOA-002', 'Wire Transfer', 'Partial - credit note pending'),
      ('REC-2024-013', 'Atlas Group', 31500.00, 31500.00, 0.00, 'AR-INV-011', 'fully_applied', '2024-04-01', 'Chase-001', 'ACH', 'Final project payment'),
      ('REC-2024-014', 'Unknown Entity', 3200.00, 0.00, 3200.00, NULL, 'unapplied', '2024-04-05', 'Wells-003', 'Wire Transfer', 'Incomplete remittance'),
      ('REC-2024-015', 'Falcon Enterprises', 38500.00, 38500.00, 0.00, 'AR-INV-013, AR-INV-025', 'fully_applied', '2024-04-10', 'Chase-001', 'Wire Transfer', 'Q2 advance + retainer'),
      ('REC-2024-016', 'Titan Industries', 6000.00, 4500.00, 1500.00, 'AR-INV-014', 'partially_applied', '2024-04-15', 'BOA-002', 'Check', 'Check #5102 - deductions')
    `);

    // Seed discounts (15+ items)
    await client.query(`
      INSERT INTO discounts (invoice_number, vendor_name, invoice_amount, discount_terms, discount_percent, discount_amount, discount_deadline, payment_status, capture_status, potential_savings, priority) VALUES
      ('INV-2024-001', 'Acme Corp', 15250.00, '2/10 Net 30', 2.00, 305.00, '2024-01-25', 'paid', 'captured', 305.00, 'high'),
      ('INV-2024-002', 'TechParts Inc', 8750.50, '1/15 Net 45', 1.00, 87.51, '2024-02-04', 'unpaid', 'available', 87.51, 'medium'),
      ('INV-2024-003', 'GlobalShip LLC', 3200.00, '3/10 Net 30', 3.00, 96.00, '2024-02-11', 'unpaid', 'expiring_soon', 96.00, 'high'),
      ('INV-2024-008', 'DataLink Systems', 22000.00, '2/10 Net 30', 2.00, 440.00, '2024-03-11', 'unpaid', 'available', 440.00, 'high'),
      ('INV-2024-010', 'LegalEagle LLP', 7500.00, '1/10 Net 30', 1.00, 75.00, '2024-03-20', 'paid', 'captured', 75.00, 'low'),
      ('INV-2024-012', 'MarketBuzz Agency', 18500.00, '2/15 Net 45', 2.00, 370.00, '2024-04-04', 'unpaid', 'available', 370.00, 'high'),
      ('INV-2024-013', 'RentSpace Properties', 45000.00, '1/10 Net 30', 1.00, 450.00, '2024-04-11', 'paid', 'captured', 450.00, 'medium'),
      ('INV-2024-015', 'HealthFirst Insurance', 28000.00, '2/10 Net 30', 2.00, 560.00, '2024-04-20', 'unpaid', 'available', 560.00, 'high'),
      ('INV-2024-016', 'SoftLicense Corp', 9800.00, '3/10 Net 30', 3.00, 294.00, '2024-04-25', 'unpaid', 'expiring_soon', 294.00, 'critical'),
      ('INV-D-001', 'Pacific Supplies', 6500.00, '2/10 Net 30', 2.00, 130.00, '2024-03-15', 'paid', 'missed', 130.00, 'low'),
      ('INV-D-002', 'Metro Logistics', 11200.00, '1.5/10 Net 45', 1.50, 168.00, '2024-03-20', 'unpaid', 'available', 168.00, 'medium'),
      ('INV-D-003', 'Allied Materials', 34000.00, '2/10 Net 30', 2.00, 680.00, '2024-03-25', 'unpaid', 'available', 680.00, 'high'),
      ('INV-D-004', 'FastTrack Couriers', 2800.00, '5/10 Net 30', 5.00, 140.00, '2024-04-01', 'paid', 'captured', 140.00, 'medium'),
      ('INV-D-005', 'GreenEnergy Co', 19500.00, '2/15 Net 60', 2.00, 390.00, '2024-04-15', 'unpaid', 'available', 390.00, 'high'),
      ('INV-D-006', 'Nationwide Services', 7300.00, '1/10 Net 30', 1.00, 73.00, '2024-04-10', 'paid', 'missed', 73.00, 'low'),
      ('INV-D-007', 'Continental Supply', 16800.00, '2.5/10 Net 30', 2.50, 420.00, '2024-04-20', 'unpaid', 'expiring_soon', 420.00, 'critical')
    `);

    // Seed aging records (15+ items)
    await client.query(`
      INSERT INTO aging_records (entity_name, entity_type, total_outstanding, current_amount, days_1_30, days_31_60, days_61_90, days_over_90, credit_limit, risk_rating, last_payment_date, avg_days_to_pay) VALUES
      ('Stellar Industries', 'customer', 45000.00, 12500.00, 15000.00, 10000.00, 5000.00, 2500.00, 100000.00, 'low', '2024-03-15', 28),
      ('Nova Solutions', 'customer', 32000.00, 8000.00, 12000.00, 8000.00, 4000.00, 0.00, 50000.00, 'medium', '2024-03-10', 35),
      ('Quantum Dynamics', 'customer', 67500.00, 25000.00, 20000.00, 15000.00, 5000.00, 2500.00, 80000.00, 'medium', '2024-03-01', 42),
      ('Apex Manufacturing', 'customer', 18500.00, 5600.00, 8000.00, 3000.00, 1900.00, 0.00, 30000.00, 'low', '2024-03-12', 25),
      ('BlueWave Tech', 'customer', 89000.00, 31200.00, 25000.00, 18000.00, 10000.00, 4800.00, 120000.00, 'high', '2024-02-20', 55),
      ('Horizon Partners', 'customer', 15400.00, 3400.00, 6000.00, 4000.00, 2000.00, 0.00, 25000.00, 'low', '2024-03-08', 30),
      ('Summit Corp', 'customer', 125000.00, 42000.00, 35000.00, 25000.00, 15000.00, 8000.00, 150000.00, 'high', '2024-02-15', 48),
      ('Acme Corp', 'vendor', 52000.00, 15250.00, 18000.00, 12000.00, 4750.00, 2000.00, NULL, 'medium', '2024-03-05', 32),
      ('TechParts Inc', 'vendor', 28750.00, 8750.50, 10000.00, 6000.00, 4000.00, 0.00, NULL, 'low', '2024-03-11', 27),
      ('DataLink Systems', 'vendor', 44000.00, 22000.00, 12000.00, 8000.00, 2000.00, 0.00, NULL, 'low', '2024-03-01', 22),
      ('EcoGreen Ltd', 'customer', 38750.00, 15750.00, 12000.00, 7000.00, 3000.00, 1000.00, 60000.00, 'medium', '2024-03-05', 38),
      ('PrimeLogistics', 'customer', 21100.00, 9100.00, 6000.00, 4000.00, 2000.00, 0.00, 35000.00, 'low', '2024-03-10', 31),
      ('Falcon Enterprises', 'customer', 58800.00, 19800.00, 18000.00, 12000.00, 6000.00, 3000.00, 75000.00, 'medium', '2024-04-01', 36),
      ('Titan Industries', 'customer', 24500.00, 4500.00, 8000.00, 6000.00, 4000.00, 2000.00, 40000.00, 'high', '2024-04-05', 52),
      ('Vanguard Systems', 'customer', 72300.00, 27300.00, 22000.00, 15000.00, 5000.00, 3000.00, 90000.00, 'medium', '2024-04-10', 33),
      ('MarketBuzz Agency', 'vendor', 36500.00, 18500.00, 10000.00, 5000.00, 3000.00, 0.00, NULL, 'low', '2024-03-20', 24)
    `);

    // Seed contacts
    await client.query(`
      INSERT INTO contacts (name, type, email, phone, company, address, payment_terms, credit_limit, status, notes) VALUES
      ('John Smith', 'customer', 'john@stellar.com', '555-0101', 'Stellar Industries', '123 Main St, New York, NY', 'Net 30', 100000.00, 'active', 'Key enterprise account'),
      ('Sarah Johnson', 'customer', 'sarah@nova.com', '555-0102', 'Nova Solutions', '456 Tech Ave, San Francisco, CA', 'Net 45', 50000.00, 'active', 'Growing mid-market client'),
      ('Mike Chen', 'customer', 'mike@quantum.com', '555-0103', 'Quantum Dynamics', '789 Science Blvd, Boston, MA', 'Net 30', 80000.00, 'active', 'Long-term strategic partner'),
      ('Lisa Park', 'vendor', 'lisa@acme.com', '555-0201', 'Acme Corp', '321 Supply Rd, Chicago, IL', '2/10 Net 30', NULL, 'active', 'Primary office supplies vendor'),
      ('David Brown', 'vendor', 'david@techparts.com', '555-0202', 'TechParts Inc', '654 Hardware Ln, Austin, TX', '1/15 Net 45', NULL, 'active', 'IT equipment supplier'),
      ('Emily White', 'customer', 'emily@bluewave.com', '555-0104', 'BlueWave Tech', '987 Ocean Dr, Miami, FL', 'Net 60', 120000.00, 'active', 'Enterprise SaaS customer'),
      ('Robert Taylor', 'vendor', 'robert@datalink.com', '555-0203', 'DataLink Systems', '147 Network St, Seattle, WA', 'Net 30', NULL, 'active', 'Network infrastructure partner'),
      ('Amanda Lee', 'customer', 'amanda@summit.com', '555-0105', 'Summit Corp', '258 Peak Ave, Denver, CO', 'Net 30', 150000.00, 'active', 'Largest customer by revenue'),
      ('James Wilson', 'vendor', 'james@globalship.com', '555-0204', 'GlobalShip LLC', '369 Port Rd, Los Angeles, CA', 'Net 30', NULL, 'active', 'International shipping partner'),
      ('Maria Garcia', 'customer', 'maria@horizon.com', '555-0106', 'Horizon Partners', '741 Vista Ln, Phoenix, AZ', 'Net 45', 25000.00, 'inactive', 'Reduced activity - follow up needed'),
      ('Tom Anderson', 'vendor', 'tom@cleanpro.com', '555-0205', 'CleanPro Services', '852 Fresh St, Portland, OR', 'Net 15', NULL, 'active', 'Facilities management vendor'),
      ('Jennifer Kim', 'customer', 'jennifer@falcon.com', '555-0107', 'Falcon Enterprises', '963 Eagle Way, Dallas, TX', 'Net 30', 75000.00, 'active', 'Consistent monthly retainer')
    `);

    // Seed audit log
    await client.query(`
      INSERT INTO audit_log (user_name, user_email, module, action, record_id, details, created_at) VALUES
      ('Demo User', 'demo@apar.com', 'invoices', 'create', 1, 'Created invoice INV-2024-001 for Acme Corp ($15,250.00)', '2024-01-15 09:00:00'),
      ('Admin User', 'admin@apar.com', 'invoices', 'update', 1, 'Updated match_status to matched', '2024-01-16 10:30:00'),
      ('Demo User', 'demo@apar.com', 'payments', 'create', 1, 'Recorded payment PAY-2024-001 from Stellar Industries ($12,500.00)', '2024-01-20 11:00:00'),
      ('Demo User', 'demo@apar.com', 'payments', 'update', 1, 'Reconciled payment PAY-2024-001', '2024-01-21 14:00:00'),
      ('Admin User', 'admin@apar.com', 'dunning', 'create', 1, 'Created dunning record for Redstone Corp (AR-INV-101)', '2024-02-01 09:30:00'),
      ('Demo User', 'demo@apar.com', 'dunning', 'update', 6, 'Escalated Emerald Solutions to legal status', '2024-02-05 16:00:00'),
      ('Admin User', 'admin@apar.com', 'cash-applications', 'create', 1, 'Applied receipt REC-2024-001 from Stellar Industries', '2024-01-15 10:00:00'),
      ('Demo User', 'demo@apar.com', 'discounts', 'update', 1, 'Captured discount on INV-2024-001 - saved $305.00', '2024-01-20 11:30:00'),
      ('Admin User', 'admin@apar.com', 'contacts', 'create', 1, 'Added contact John Smith (Stellar Industries)', '2024-01-10 08:00:00'),
      ('Demo User', 'demo@apar.com', 'invoices', 'delete', 99, 'Deleted duplicate invoice INV-TEMP-001', '2024-02-10 15:00:00'),
      ('Admin User', 'admin@apar.com', 'aging', 'update', 5, 'Updated risk rating for BlueWave Tech to high', '2024-03-01 09:00:00'),
      ('Demo User', 'demo@apar.com', 'payments', 'create', 8, 'Recorded unidentified payment PAY-2024-008 ($7,800.00)', '2024-03-01 13:00:00')
    `);

    await client.query('COMMIT');
    console.log('✅ Database seeded successfully!');
    console.log('   Demo accounts loaded; password supplied through DEMO_PASSWORD.');
  } catch (err) {
    await client.query('ROLLBACK');
    console.error('❌ Seed failed:', err.message);
    throw err;
  } finally {
    client.release();
    await pool.end();
  }
}

seed();
