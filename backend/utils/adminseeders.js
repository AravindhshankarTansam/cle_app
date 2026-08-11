import { getDatabase, initDatabase } from '../database.js';
import { hashPassword } from './password.js';

async function seed() {
  console.log('Starting comprehensive database seeding...');
  await initDatabase();
  const { db } = await getDatabase();
  // Seed Admin User
  console.log('Seeding Admin User account...');
  const adminEmail = 'admin@khgroup.com';
  const adminPass = hashPassword('admin123');
  
  await db.query(
    `INSERT INTO users (name, phone, proficiency, status, designation, email, password, role) 
     VALUES (?, ?, ?, ?, ?, ?, ?, ?)
     ON DUPLICATE KEY UPDATE password = VALUES(password)`,
    ['KH Group Admin', '+91 99999 00000', 'Admin', 'Active', 'System Administrator', adminEmail, adminPass, 'Admin']
  );

  console.log('\nSeeding completed successfully!');
  console.log('======================================================');
  console.log('You can log in using the exact Email Address:');
  console.log('------------------------------------------------------');
  console.log('1. Email: "admin@khgroup.com"         Password: "admin123"');
  console.log('======================================================');
  process.exit(0);
}

seed().catch(err => {
  console.error('Seeding error:', err);
  process.exit(1);
});