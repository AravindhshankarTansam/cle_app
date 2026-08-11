import { getDatabase, initDatabase } from '../database.js';

async function seed() {
  console.log('Starting roles database seeding...');
  await initDatabase();
  const { db } = await getDatabase();

  // Clear roles (need to set FOREIGN_KEY_CHECKS=0 in case users exist referencing roles)
  console.log('Clearing roles table...');
  await db.query('SET FOREIGN_KEY_CHECKS = 0');
  await db.query('DELETE FROM roles');

  console.log('Seeding system roles...');
  const roleSeeds = [
    ['Admin', 'System Administrator with full roster management permissions'],
    ['HR', 'Human Resources manager with full roster management permissions'],
    ['CEO', 'Chief Executive Officer with read-only metrics visibility'],
    ['Block Manager', 'Manager assigned to view and manage Block scope workers'],
    ['Floor Manager', 'Manager assigned to view and manage Floor scope workers'],
    ['Line Supervisor', 'Supervisor assigned to view and manage Assembly Line scope workers'],
    ['Employee', 'Standard staff/worker role']
  ];

  for (const [name, desc] of roleSeeds) {
    await db.query(
      'INSERT INTO roles (role_name, description) VALUES (?, ?)',
      [name, desc]
    );
  }

  await db.query('SET FOREIGN_KEY_CHECKS = 1');
  console.log('Roles seeding completed successfully!');
  process.exit(0);
}

seed().catch(err => {
  console.error('Roles seeding error:', err);
  process.exit(1);
});
