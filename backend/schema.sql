-- Create Database
CREATE DATABASE IF NOT EXISTS missed_call_db;
USE missed_call_db;

-- 1. Departments Table
CREATE TABLE IF NOT EXISTS departments (
  id INT AUTO_INCREMENT PRIMARY KEY,
  name VARCHAR(100) UNIQUE NOT NULL,
  min_workers INT DEFAULT 5
);

-- 2. Shifts Table
CREATE TABLE IF NOT EXISTS shifts (
  id INT AUTO_INCREMENT PRIMARY KEY,
  name VARCHAR(50) UNIQUE NOT NULL,
  start_time VARCHAR(10) NOT NULL,
  end_time VARCHAR(10) NOT NULL
);

-- 3. Workers Table
CREATE TABLE IF NOT EXISTS workers (
  id INT AUTO_INCREMENT PRIMARY KEY,
  name VARCHAR(100) NOT NULL,
  phone VARCHAR(20) UNIQUE NOT NULL,
  department_id INT,
  default_shift_id INT,
  status VARCHAR(20) DEFAULT 'Active',
  FOREIGN KEY (department_id) REFERENCES departments(id) ON DELETE SET NULL,
  FOREIGN KEY (default_shift_id) REFERENCES shifts(id) ON DELETE SET NULL
);

-- 4. Attendance Table
CREATE TABLE IF NOT EXISTS attendance (
  id INT AUTO_INCREMENT PRIMARY KEY,
  worker_id INT NOT NULL,
  date DATE NOT NULL,
  call_time DATETIME,
  status VARCHAR(20) DEFAULT 'Coming',
  method VARCHAR(30) DEFAULT 'Missed Call',
  FOREIGN KEY (worker_id) REFERENCES workers(id) ON DELETE CASCADE
);

-- 5. Daily Work Allocations Table
CREATE TABLE IF NOT EXISTS work_allocations (
  id INT AUTO_INCREMENT PRIMARY KEY,
  date DATE NOT NULL,
  worker_id INT NOT NULL,
  department_id INT NOT NULL,
  task_assigned VARCHAR(255),
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (worker_id) REFERENCES workers(id) ON DELETE CASCADE,
  FOREIGN KEY (department_id) REFERENCES departments(id) ON DELETE CASCADE
);

-- ----------------------------------------------------
-- SEED DATA (OPTIONAL)
-- ----------------------------------------------------

INSERT INTO departments (name, min_workers) VALUES 
('Assembly Line', 4),
('Quality Control', 2),
('Packaging', 3),
('Maintenance', 1)
ON DUPLICATE KEY UPDATE name=name;

INSERT INTO shifts (name, start_time, end_time) VALUES
('General Shift', '09:00', '17:00'),
('Morning Shift (A)', '06:00', '14:00'),
('Evening Shift (B)', '14:00', '22:00')
ON DUPLICATE KEY UPDATE name=name;
