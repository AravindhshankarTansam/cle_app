import { getDatabase } from '../database.js';

export async function getDepartments(req, res) {
  try {
    const { db } = await getDatabase();
    const [departments] = await db.query('SELECT * FROM departments ORDER BY name ASC');
    res.json(departments);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
}

export async function createDepartment(req, res) {
  const { name, min_workers } = req.body;
  if (!name) return res.status(400).json({ error: 'Department name is required.' });
  try {
    const { db } = await getDatabase();
    const [result] = await db.query(
      'INSERT INTO departments (name, min_workers) VALUES (?, ?)',
      [name, min_workers || 5]
    );
    res.status(201).json({ id: result.insertId, name, min_workers });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
}

export async function updateDepartment(req, res) {
  const { id } = req.params;
  const { name, min_workers } = req.body;
  try {
    const { db } = await getDatabase();
    await db.query(
      'UPDATE departments SET name = ?, min_workers = ? WHERE id = ?',
      [name, min_workers, id]
    );
    res.json({ success: true });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
}

export async function deleteDepartment(req, res) {
  const { id } = req.params;
  try {
    const { db } = await getDatabase();
    await db.query('DELETE FROM departments WHERE id = ?', [id]);
    res.json({ success: true });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
}
