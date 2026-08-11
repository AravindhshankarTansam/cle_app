import { getDatabase } from '../database.js';

export async function getShifts(req, res) {
  try {
    const { db } = await getDatabase();
    const [shifts] = await db.query('SELECT * FROM shifts ORDER BY name ASC');
    res.json(shifts);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
}

export async function createShift(req, res) {
  try {
    const { name, start_time, end_time } = req.body;
    if (!name || !start_time || !end_time) {
      return res.status(400).json({ error: 'Name, start time, and end time are required' });
    }
    const { db } = await getDatabase();
    const [result] = await db.query(
      'INSERT INTO shifts (name, start_time, end_time) VALUES (?, ?, ?)',
      [name, start_time, end_time]
    );
    res.status(201).json({ id: result.insertId, name, start_time, end_time });
  } catch (error) {
    if (error.code === 'ER_DUP_ENTRY') {
      res.status(400).json({ error: 'Shift name already exists' });
    } else {
      res.status(500).json({ error: error.message });
    }
  }
}

export async function updateShift(req, res) {
  try {
    const { id } = req.params;
    const { name, start_time, end_time } = req.body;
    if (!name || !start_time || !end_time) {
      return res.status(400).json({ error: 'Name, start time, and end time are required' });
    }
    const { db } = await getDatabase();
    await db.query(
      'UPDATE shifts SET name = ?, start_time = ?, end_time = ? WHERE id = ?',
      [name, start_time, end_time, id]
    );
    res.json({ success: true });
  } catch (error) {
    if (error.code === 'ER_DUP_ENTRY') {
      res.status(400).json({ error: 'Shift name already exists' });
    } else {
      res.status(500).json({ error: error.message });
    }
  }
}

export async function deleteShift(req, res) {
  try {
    const { id } = req.params;
    const { db } = await getDatabase();
    // Check if shift is mapped to workers
    const [workers] = await db.query('SELECT COUNT(*) as count FROM users WHERE default_shift_id = ?', [id]);
    if (workers[0].count > 0) {
      return res.status(400).json({ error: 'Cannot delete shift. It is mapped to existing workers.' });
    }
    await db.query('DELETE FROM shifts WHERE id = ?', [id]);
    res.json({ message: 'Shift deleted successfully' });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
}
