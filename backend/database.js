import mysql from 'mysql2/promise';
import dotenv from 'dotenv';
dotenv.config();

let dbInstance = null;

export async function getDatabase() {
  if (dbInstance) return { db: dbInstance, type: 'mysql' };

  try {
    console.log('Attempting to connect to MySQL database...');
    const pool = mysql.createPool({
      host: process.env.DB_HOST || 'localhost',
      user: process.env.DB_USER || 'root',
      password: process.env.DB_PASSWORD || '',
      database: process.env.DB_NAME || 'missed_call_db',
      port: process.env.DB_PORT ? parseInt(process.env.DB_PORT) : 3306,
      waitForConnections: true,
      connectionLimit: 10,
      queueLimit: 0,
      multipleStatements: true
    });
    
    // Create the database if it doesn't exist
    const connection = await mysql.createConnection({
      host: process.env.DB_HOST || 'localhost',
      user: process.env.DB_USER || 'root',
      password: process.env.DB_PASSWORD || '',
      port: process.env.DB_PORT ? parseInt(process.env.DB_PORT) : 3306,
    });
    await connection.query(`CREATE DATABASE IF NOT EXISTS \`${process.env.DB_NAME || 'missed_call_db'}\``);
    await connection.end();

    // Test connection
    const conn = await pool.getConnection();
    conn.release();
    console.log('Successfully connected to MySQL database.');
    dbInstance = pool;
    return { db: pool, type: 'mysql' };
  } catch (err) {
    console.error('MySQL connection failed.', err.message);
    throw err;
  }
}

export async function initDatabase() {
  const { db } = await getDatabase();
  console.log(`Initializing schema for MySQL...`);

  // 1. Hierarchy - Blocks Table
  await db.query(`
    CREATE TABLE IF NOT EXISTS blocks (
      id INT AUTO_INCREMENT PRIMARY KEY,
      name VARCHAR(100) UNIQUE NOT NULL
    )
  `);

  // 2. Hierarchy - Floors Table
  await db.query(`
    CREATE TABLE IF NOT EXISTS floors (
      id INT AUTO_INCREMENT PRIMARY KEY,
      name VARCHAR(100) NOT NULL,
      block_id INT NOT NULL,
      FOREIGN KEY (block_id) REFERENCES blocks(id) ON DELETE CASCADE,
      UNIQUE KEY uq_block_floor (block_id, name)
    )
  `);

  // 3. Hierarchy - Assembly Lines Table
  await db.query(`
    CREATE TABLE IF NOT EXISTS assembly_lines (
      id INT AUTO_INCREMENT PRIMARY KEY,
      name VARCHAR(100) NOT NULL,
      floor_id INT NOT NULL,
      required_workers INT DEFAULT 20,
      FOREIGN KEY (floor_id) REFERENCES floors(id) ON DELETE CASCADE,
      UNIQUE KEY uq_floor_line (floor_id, name)
    )
  `);

  await db.query(`
    CREATE TABLE IF NOT EXISTS departments (
      id INT AUTO_INCREMENT PRIMARY KEY,
      name VARCHAR(100) UNIQUE NOT NULL,
      min_workers INT DEFAULT 5
    )
  `);

  await db.query(`
    CREATE TABLE IF NOT EXISTS skills (
      id INT AUTO_INCREMENT PRIMARY KEY,
      main_skill VARCHAR(100) UNIQUE NOT NULL,
      sub_skills JSON NOT NULL
    )
  `);

  await db.query(`
    CREATE TABLE IF NOT EXISTS shifts (
      id INT AUTO_INCREMENT PRIMARY KEY,
      name VARCHAR(50) UNIQUE NOT NULL,
      start_time VARCHAR(10) NOT NULL,
      end_time VARCHAR(10) NOT NULL
    )
  `);

  // Role Master Table
  await db.query(`
    CREATE TABLE IF NOT EXISTS roles (
      id INT AUTO_INCREMENT PRIMARY KEY,
      role_name VARCHAR(100) UNIQUE NOT NULL,
      description VARCHAR(255)
    )
  `);

  // Seed default roles
  console.log('Verifying and seeding default roles...');
  const defaultRoles = [
    { name: 'Admin', desc: 'System Administrator with full roster management permissions' },
    { name: 'HR', desc: 'Human Resources manager with full roster management permissions' },
    { name: 'CEO', desc: 'Chief Executive Officer with read-only metrics visibility' },
    { name: 'Block Manager', desc: 'Manager assigned to view and manage Block scope workers' },
    { name: 'Floor Manager', desc: 'Manager assigned to view and manage Floor scope workers' },
    { name: 'Line Supervisor', desc: 'Supervisor assigned to view and manage Assembly Line scope workers' },
    { name: 'IE', desc: 'Industrial Engineer with headcount planning permissions' },
    { name: 'Employee', desc: 'Standard staff/worker role' }
  ];

  for (const role of defaultRoles) {
    const [rows] = await db.query('SELECT id FROM roles WHERE role_name = ?', [role.name]);
    if (rows.length === 0) {
      await db.query('INSERT INTO roles (role_name, description) VALUES (?, ?)', [role.name, role.desc]);
    }
  }

  await db.query(`
    CREATE TABLE IF NOT EXISTS users (
      id INT AUTO_INCREMENT PRIMARY KEY,
      name VARCHAR(100) NOT NULL,
      phone VARCHAR(20) UNIQUE NOT NULL,
      department_id INT,
      default_shift_id INT,
      status VARCHAR(20) DEFAULT 'Active',
      skill_id INT NULL,
      sub_skill VARCHAR(100) NULL,
      line_id INT NULL,
      proficiency VARCHAR(50) DEFAULT 'Intermediate',
      designation VARCHAR(100) NULL,
      block_id INT NULL,
      floor_id INT NULL,
      email VARCHAR(255) UNIQUE NULL,
      password VARCHAR(255) NULL,
      role VARCHAR(50) DEFAULT 'Employee',
      FOREIGN KEY (department_id) REFERENCES departments(id) ON DELETE SET NULL,
      FOREIGN KEY (default_shift_id) REFERENCES shifts(id) ON DELETE SET NULL,
      FOREIGN KEY (skill_id) REFERENCES skills(id) ON DELETE SET NULL,
      FOREIGN KEY (line_id) REFERENCES assembly_lines(id) ON DELETE SET NULL,
      FOREIGN KEY (block_id) REFERENCES blocks(id) ON DELETE SET NULL,
      FOREIGN KEY (floor_id) REFERENCES floors(id) ON DELETE SET NULL,
      FOREIGN KEY (role) REFERENCES roles(role_name)
    )
  `);

  await db.query(`
    CREATE TABLE IF NOT EXISTS attendance (
      id INT AUTO_INCREMENT PRIMARY KEY,
      worker_id INT NOT NULL,
      date DATE NOT NULL,
      call_time DATETIME,
      status VARCHAR(20) DEFAULT 'Coming',
      method VARCHAR(30) DEFAULT 'Missed Call',
      FOREIGN KEY (worker_id) REFERENCES users(id) ON DELETE CASCADE
    )
  `);

  await db.query(`
    CREATE TABLE IF NOT EXISTS work_allocations (
      id INT AUTO_INCREMENT PRIMARY KEY,
      date DATE NOT NULL,
      worker_id INT NOT NULL,
      department_id INT NOT NULL,
      task_assigned VARCHAR(255),
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      FOREIGN KEY (worker_id) REFERENCES users(id) ON DELETE CASCADE,
      FOREIGN KEY (department_id) REFERENCES departments(id) ON DELETE CASCADE
    )
  `);

  // Daily Line-to-Line Manual Reassignments
  await db.query(`
    CREATE TABLE IF NOT EXISTS line_allocations (
      id INT AUTO_INCREMENT PRIMARY KEY,
      date DATE NOT NULL,
      worker_id INT NOT NULL,
      original_line_id INT NOT NULL,
      allocated_line_id INT NOT NULL,
      reason VARCHAR(255) DEFAULT 'Manual Reassignment',
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      FOREIGN KEY (worker_id) REFERENCES users(id) ON DELETE CASCADE,
      FOREIGN KEY (original_line_id) REFERENCES assembly_lines(id) ON DELETE CASCADE,
      FOREIGN KEY (allocated_line_id) REFERENCES assembly_lines(id) ON DELETE CASCADE,
      UNIQUE KEY uq_date_worker (date, worker_id)
    )
  `);

  // Table to store confirmed work coming logs from admin mobile app missed calls
  await db.query(`
    CREATE TABLE IF NOT EXISTS confirm_work_coming (
      id INT AUTO_INCREMENT PRIMARY KEY,
      caller_number VARCHAR(30) NOT NULL,
      worker_name VARCHAR(100),
      department_name VARCHAR(100),
      call_date DATE NOT NULL,
      call_time VARCHAR(10) NOT NULL,
      submitted_by VARCHAR(50),
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP
    )
  `);

  // Drop table raw_call_logs first if it has obsolete columns from old MyOperator webhook structure
  try {
    const [cols] = await db.query("SHOW COLUMNS FROM raw_call_logs LIKE 'call_date'");
    if (cols.length === 0) {
      console.log('Obsolete raw_call_logs table found. Dropping and recreating it...');
      await db.query('DROP TABLE IF EXISTS raw_call_logs');
    }
  } catch (e) {
    // raw_call_logs doesn't exist yet, ignore
  }

  // Table to store all raw call logs posted by mobile app
  await db.query(`
    CREATE TABLE IF NOT EXISTS raw_call_logs (
      id INT AUTO_INCREMENT PRIMARY KEY,
      caller_number VARCHAR(30) NOT NULL,
      call_date DATE NOT NULL,
      call_time VARCHAR(10) NOT NULL,
      submitted_by VARCHAR(50),
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP
    )
  `);

  // Mobile admin-captured missed call logs
  await db.query(`
    CREATE TABLE IF NOT EXISTS mobile_call_logs (
      id INT AUTO_INCREMENT PRIMARY KEY,
      caller_number VARCHAR(30) NOT NULL,
      call_date DATE NOT NULL,
      call_time VARCHAR(10) NOT NULL,
      submitted_by VARCHAR(50),
      matched_worker_id INT,
      shortage_count INT DEFAULT 0,
      notes TEXT,
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      FOREIGN KEY (matched_worker_id) REFERENCES users(id) ON DELETE SET NULL
    )
  `);

  // Resource Requests workflow
  await db.query(`
    CREATE TABLE IF NOT EXISTS resource_requests (
      id INT AUTO_INCREMENT PRIMARY KEY,
      date DATE NOT NULL,
      requester_id INT NOT NULL,
      requester_role VARCHAR(50) NOT NULL,
      target_role VARCHAR(50) NOT NULL,
      target_floor_id INT NULL,
      target_block_id INT NULL,
      requested_skill_id INT NULL,
      count INT NOT NULL DEFAULT 1,
      source_line_id INT NULL,
      destination_line_id INT NOT NULL,
      status VARCHAR(20) DEFAULT 'Pending',
      fulfilled_count INT DEFAULT 0,
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      FOREIGN KEY (requester_id) REFERENCES users(id) ON DELETE CASCADE,
      FOREIGN KEY (target_floor_id) REFERENCES floors(id) ON DELETE CASCADE,
      FOREIGN KEY (target_block_id) REFERENCES blocks(id) ON DELETE CASCADE,
      FOREIGN KEY (requested_skill_id) REFERENCES skills(id) ON DELETE SET NULL,
      FOREIGN KEY (source_line_id) REFERENCES assembly_lines(id) ON DELETE CASCADE,
      FOREIGN KEY (destination_line_id) REFERENCES assembly_lines(id) ON DELETE CASCADE
    )
  `);

  await db.query(`
    CREATE TABLE IF NOT EXISTS resource_request_fulfillments (
      id INT AUTO_INCREMENT PRIMARY KEY,
      request_id INT NOT NULL,
      worker_id INT NOT NULL,
      approved_by INT NOT NULL,
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      FOREIGN KEY (request_id) REFERENCES resource_requests(id) ON DELETE CASCADE,
      FOREIGN KEY (worker_id) REFERENCES users(id) ON DELETE CASCADE,
      FOREIGN KEY (approved_by) REFERENCES users(id) ON DELETE CASCADE,
      UNIQUE KEY uq_req_worker (request_id, worker_id)
    )
  `);

  // IE Manpower Requirements per designation per date range
  await db.query(`
    CREATE TABLE IF NOT EXISTS ie_manpower_requirements (
      id INT AUTO_INCREMENT PRIMARY KEY,
      designation VARCHAR(100) NOT NULL,
      from_date DATE NOT NULL,
      to_date DATE NOT NULL,
      block_id INT NOT NULL DEFAULT 0,
      floor_id INT NOT NULL DEFAULT 0,
      line_id INT NOT NULL DEFAULT 0,
      product_name VARCHAR(100) NOT NULL DEFAULT 'General',
      style_number VARCHAR(100) NOT NULL DEFAULT '',
      production_target INT NOT NULL DEFAULT 0,
      ie_manpower INT NOT NULL DEFAULT 0,
      UNIQUE KEY uq_target (designation, from_date, to_date, block_id, floor_id, line_id, product_name, style_number)
    )
  `);

  try {
    await db.query(`ALTER TABLE ie_manpower_requirements ADD COLUMN style_number VARCHAR(100) NOT NULL DEFAULT ''`);
  } catch (e) {
    // Column already exists or error safely caught
  }
}
