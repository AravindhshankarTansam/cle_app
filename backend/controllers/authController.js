import { getDatabase } from '../database.js';
import { hashPassword } from '../utils/password.js';

export async function login(req, res) {
  const { email, username, userId, password } = req.body;
  const rawInput = email || username || userId;
  if (!rawInput || !password) {
    return res.status(400).json({ error: 'User ID / Email and password are required.' });
  }

  try {
    const { db } = await getDatabase();
    const cleanInput = String(rawInput).trim();

    let sql = 'SELECT * FROM users WHERE LOWER(email) = ? OR LOWER(name) = ? OR phone = ?';
    let params = [cleanInput.toLowerCase(), cleanInput.toLowerCase(), cleanInput];

    if (/^\d+$/.test(cleanInput)) {
      sql += ' OR id = ?';
      params.push(parseInt(cleanInput, 10));
    }

    const [users] = await db.query(sql, params);

    if (users.length === 0) {
      return res.status(401).json({ error: 'Invalid User ID/email or password.' });
    }

    const user = users[0];
    if (user.password !== hashPassword(password)) {
      return res.status(401).json({ error: 'Invalid email/username or password.' });
    }

    const allowedRoles = [
      'Block Supervisor', 'Floor Supervisor', 'Assembly Line Supervisor',
      'HR', 'Admin', 'Manager', 'Supervisor',
      'CEO', 'Block Manager', 'Floor Manager', 'Line Supervisor', 'IE'
    ];
    if (!allowedRoles.includes(user.role)) {
      return res.status(403).json({ error: 'Access denied. Authorized roles only.' });
    }

    res.json({
      success: true,
      user: {
        id: user.id,
        email: user.email,
        name: user.name,
        role: user.role
      }
    });
  } catch (error) {
    console.error('Login error:', error);
    res.status(500).json({ error: 'Server error during authentication.' });
  }
}

export async function getMe(req, res) {
  try {
    const { db } = await getDatabase();
    const userId = req.user.id;
    
    const [users] = await db.query(`
      SELECT w.*, d.name as department_name, s.name as shift_name, s.start_time, s.end_time,
             sk.main_skill, al.name as line_name, 
             COALESCE(f.name, f2.name) as floor_name, 
             COALESCE(b.name, b2.name, b3.name) as block_name
      FROM users w
      LEFT JOIN departments d ON w.department_id = d.id
      LEFT JOIN shifts s ON w.default_shift_id = s.id
      LEFT JOIN skills sk ON w.skill_id = sk.id
      LEFT JOIN assembly_lines al ON w.line_id = al.id
      LEFT JOIN floors f ON al.floor_id = f.id
      LEFT JOIN floors f2 ON w.floor_id = f2.id
      LEFT JOIN blocks b ON f.block_id = b.id
      LEFT JOIN blocks b2 ON f2.block_id = b2.id
      LEFT JOIN blocks b3 ON w.block_id = b3.id
      WHERE w.id = ?
    `, [userId]);

    if (users.length === 0) {
      return res.status(404).json({ error: 'User profile not found.' });
    }

    res.json(users[0]);
  } catch (error) {
    console.error('Error fetching profile:', error);
    res.status(500).json({ error: 'Server error.' });
  }
}
