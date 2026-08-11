import { getDatabase } from '../database.js';

export async function getRoles(req, res) {
  try {
    const { db } = await getDatabase();
    const [roles] = await db.query('SELECT * FROM roles ORDER BY id ASC');
    res.json(roles);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
}

export async function createRole(req, res) {
  const { name } = req.body;
  if (!name) return res.status(400).json({ error: 'Role name is required.' });
  try {
    const { db } = await getDatabase();
    const [result] = await db.query('INSERT INTO roles (role_name) VALUES (?)', [name]);
    res.status(201).json({ id: result.insertId, name });
  } catch (error) {
    if (error.code === 'ER_DUP_ENTRY') {
      res.status(400).json({ error: 'Role name already exists' });
    } else {
      res.status(500).json({ error: error.message });
    }
  }
}

export async function updateRole(req, res) {
  const { id } = req.params;
  const { name } = req.body;
  if (!name) return res.status(400).json({ error: 'Role name is required.' });
  try {
    const { db } = await getDatabase();
    await db.query('UPDATE roles SET role_name = ? WHERE id = ?', [name, id]);
    res.json({ success: true });
  } catch (error) {
    if (error.code === 'ER_DUP_ENTRY') {
      res.status(400).json({ error: 'Role name already exists' });
    } else {
      res.status(500).json({ error: error.message });
    }
  }
}

export async function deleteRole(req, res) {
  const { id } = req.params;
  try {
    const { db } = await getDatabase();
    // Verify if any workers are using this role
    const [roleRes] = await db.query('SELECT role_name FROM roles WHERE id = ?', [id]);
    if (roleRes.length > 0) {
      const roleName = roleRes[0].role_name;
      const [workersRes] = await db.query('SELECT COUNT(*) as count FROM users WHERE proficiency = ?', [roleName]);
      if (workersRes[0].count > 0) {
        return res.status(400).json({ error: 'Cannot delete role: active workers are mapped to it.' });
      }
    }
    await db.query('DELETE FROM roles WHERE id = ?', [id]);
    res.json({ success: true });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
}
