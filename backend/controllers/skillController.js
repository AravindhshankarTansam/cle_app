import { getDatabase } from '../database.js';

export async function getSkills(req, res) {
  try {
    const { db } = await getDatabase();
    const [skills] = await db.query('SELECT * FROM skills ORDER BY main_skill ASC');
    const formattedSkills = skills.map(sk => {
      let subSkills = sk.sub_skills;
      if (typeof subSkills === 'string') {
        try {
          subSkills = JSON.parse(subSkills);
        } catch (e) {
          subSkills = [];
        }
      }
      return {
        ...sk,
        sub_skills: subSkills
      };
    });
    res.json(formattedSkills);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
}

export async function createSkill(req, res) {
  const { main_skill, sub_skills } = req.body;
  if (!main_skill || !sub_skills) {
    return res.status(400).json({ error: 'Main skill and Subskills list are required.' });
  }
  try {
    const { db } = await getDatabase();
    const subSkillsStr = typeof sub_skills === 'string' ? sub_skills : JSON.stringify(sub_skills);
    const [result] = await db.query(
      'INSERT INTO skills (main_skill, sub_skills) VALUES (?, ?)',
      [main_skill.trim(), subSkillsStr]
    );
    res.status(201).json({ id: result.insertId, main_skill, sub_skills });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
}

export async function updateSkill(req, res) {
  const { id } = req.params;
  const { main_skill, sub_skills } = req.body;
  if (!main_skill || !sub_skills) {
    return res.status(400).json({ error: 'Main skill and Subskills list are required.' });
  }
  try {
    const { db } = await getDatabase();
    const subSkillsStr = typeof sub_skills === 'string' ? sub_skills : JSON.stringify(sub_skills);
    await db.query(
      'UPDATE skills SET main_skill = ?, sub_skills = ? WHERE id = ?',
      [main_skill.trim(), subSkillsStr, id]
    );
    res.json({ success: true, message: 'Skill updated successfully.' });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
}

export async function deleteSkill(req, res) {
  const { id } = req.params;
  try {
    const { db } = await getDatabase();
    await db.query('DELETE FROM skills WHERE id = ?', [id]);
    res.json({ success: true, message: 'Skill deleted successfully.' });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
}
