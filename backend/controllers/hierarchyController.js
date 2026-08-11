import { getDatabase } from '../database.js';

export async function getHierarchy(req, res) {
  try {
    const { db } = await getDatabase();
    const [blocks] = await db.query('SELECT * FROM blocks ORDER BY name ASC');
    const [floors] = await db.query('SELECT * FROM floors ORDER BY name ASC');
    const [lines] = await db.query('SELECT * FROM assembly_lines ORDER BY name ASC');

    const result = blocks.map(block => {
      const blockFloors = floors.filter(f => f.block_id === block.id).map(floor => {
        const floorLines = lines.filter(l => l.floor_id === floor.id);
        return { ...floor, lines: floorLines };
      });
      return { ...block, floors: blockFloors };
    });

    res.json(result);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
}

// Blocks CRUD
export async function getBlocks(req, res) {
  try {
    const { db } = await getDatabase();
    const [rows] = await db.query('SELECT * FROM blocks ORDER BY name ASC');
    res.json(rows);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
}

export async function createBlock(req, res) {
  const { name } = req.body;
  if (!name) return res.status(400).json({ error: 'Block name is required.' });
  try {
    const { db } = await getDatabase();
    const [result] = await db.query('INSERT INTO blocks (name) VALUES (?)', [name.trim()]);
    res.status(201).json({ id: result.insertId, name: name.trim() });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
}

export async function updateBlock(req, res) {
  const { name } = req.body;
  const { id } = req.params;
  if (!name) return res.status(400).json({ error: 'Block name is required.' });
  try {
    const { db } = await getDatabase();
    await db.query('UPDATE blocks SET name = ? WHERE id = ?', [name.trim(), id]);
    res.json({ success: true, id, name: name.trim() });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
}

export async function deleteBlock(req, res) {
  const { id } = req.params;
  try {
    const { db } = await getDatabase();
    await db.query('DELETE FROM blocks WHERE id = ?', [id]);
    res.json({ success: true, message: 'Block deleted successfully.' });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
}

// Floors CRUD
export async function getFloors(req, res) {
  try {
    const { db } = await getDatabase();
    const [rows] = await db.query(`
      SELECT f.*, b.name as block_name 
      FROM floors f 
      JOIN blocks b ON f.block_id = b.id 
      ORDER BY b.name ASC, f.name ASC
    `);
    res.json(rows);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
}

export async function createFloor(req, res) {
  const { name, block_id } = req.body;
  if (!name || !block_id) return res.status(400).json({ error: 'Floor name and block ID are required.' });
  try {
    const { db } = await getDatabase();
    const [result] = await db.query('INSERT INTO floors (name, block_id) VALUES (?, ?)', [name.trim(), block_id]);
    res.status(201).json({ id: result.insertId, name: name.trim(), block_id });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
}

export async function updateFloor(req, res) {
  const { name, block_id } = req.body;
  const { id } = req.params;
  if (!name || !block_id) return res.status(400).json({ error: 'Floor name and block ID are required.' });
  try {
    const { db } = await getDatabase();
    await db.query('UPDATE floors SET name = ?, block_id = ? WHERE id = ?', [name.trim(), block_id, id]);
    res.json({ success: true, id, name: name.trim(), block_id });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
}

export async function deleteFloor(req, res) {
  const { id } = req.params;
  try {
    const { db } = await getDatabase();
    await db.query('DELETE FROM floors WHERE id = ?', [id]);
    res.json({ success: true, message: 'Floor deleted successfully.' });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
}

// Assembly Lines CRUD
export async function getAssemblyLines(req, res) {
  try {
    const { db } = await getDatabase();
    const [lines] = await db.query(`
      SELECT al.*, f.name as floor_name, b.name as block_name, f.block_id as block_id
      FROM assembly_lines al
      JOIN floors f ON al.floor_id = f.id
      JOIN blocks b ON f.block_id = b.id
      ORDER BY b.name ASC, f.name ASC, al.name ASC
    `);
    res.json(lines);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
}

export async function createAssemblyLine(req, res) {
  const { name, floor_id, required_workers } = req.body;
  if (!name || !floor_id) return res.status(400).json({ error: 'Assembly Line name and floor ID are required.' });
  const reqWorkers = required_workers !== undefined ? parseInt(required_workers) : 20;
  try {
    const { db } = await getDatabase();
    const [result] = await db.query(
      'INSERT INTO assembly_lines (name, floor_id, required_workers) VALUES (?, ?, ?)',
      [name.trim(), floor_id, reqWorkers]
    );
    res.status(201).json({ id: result.insertId, name: name.trim(), floor_id, required_workers: reqWorkers });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
}

export async function updateAssemblyLine(req, res) {
  const { name, floor_id, required_workers } = req.body;
  const { id } = req.params;
  if (!name || !floor_id) return res.status(400).json({ error: 'Assembly Line name and floor ID are required.' });
  const reqWorkers = required_workers !== undefined ? parseInt(required_workers) : 20;
  try {
    const { db } = await getDatabase();
    await db.query(
      'UPDATE assembly_lines SET name = ?, floor_id = ?, required_workers = ? WHERE id = ?',
      [name.trim(), floor_id, reqWorkers, id]
    );
    res.json({ success: true, id, name: name.trim(), floor_id, required_workers: reqWorkers });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
}

export async function deleteAssemblyLine(req, res) {
  const { id } = req.params;
  try {
    const { db } = await getDatabase();
    await db.query('DELETE FROM assembly_lines WHERE id = ?', [id]);
    res.json({ success: true, message: 'Assembly Line deleted successfully.' });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
}
