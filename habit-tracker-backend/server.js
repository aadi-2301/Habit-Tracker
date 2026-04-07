const express = require('express');
const mysql = require('mysql2');
const cors = require('cors');
const bcrypt = require('bcryptjs');
require('dotenv').config();

const app = express();
app.use(cors());
app.use(express.json());

const db = mysql.createPool({
  host: process.env.DB_HOST,
  user: process.env.DB_USER,
  password: process.env.DB_PASSWORD,
  database: process.env.DB_NAME,
  port: process.env.DB_PORT,
  waitForConnections: true,
  connectionLimit: 10,
  queueLimit: 0
});


// AUTH
app.post('/api/register', async (req, res) => {
  const { name, email_id, password } = req.body;
  const hash = await bcrypt.hash(password, 12);
  db.query('INSERT INTO users (name, email_id, password) VALUES (?,?,?)',
    [name, email_id, hash],
    (err, result) => {
      if (err) return res.status(400).json({ error: 'Email already registered' });
      res.json({ user_id: result.insertId, name, email_id });
    }
  );
});

app.post('/api/login', (req, res) => {
  const { email_id, password } = req.body;
  db.query('SELECT * FROM users WHERE email_id = ?', [email_id], async (err, rows) => {
    if (err || rows.length === 0) return res.status(401).json({ error: 'User not found' });
    const valid = await bcrypt.compare(password, rows[0].password);
    if (!valid) return res.status(401).json({ error: 'Wrong password' });
    const { password: _, ...user } = rows[0];
    res.json({ user });
  });
});

// HABITS
app.get('/api/habits/:userId', (req, res) => {
  db.query('SELECT * FROM habit WHERE user_id = ? ORDER BY habit_id DESC',
    [req.params.userId],
    (err, results) => {
      if (err) return res.status(500).json({ error: err.message });
      res.json(results);
    }
  );
});

app.post('/api/habits', (req, res) => {
  const { habit_name, description, start_date, frequency, user_id } = req.body;
  db.query(
    'INSERT INTO habit (habit_name, description, start_date, frequency, user_id) VALUES (?,?,?,?,?)',
    [habit_name, description || null, start_date, frequency, user_id],
    (err, result) => {
      if (err) return res.status(500).json({ error: err.message });
      res.json({ habit_id: result.insertId });
    }
  );
});

app.delete('/api/habits/:id', (req, res) => {
  db.query('DELETE FROM habit WHERE habit_id = ?', [req.params.id], (err) => {
    if (err) return res.status(500).json({ error: err.message });
    res.json({ success: true });
  });
});

// LOGS
app.get('/api/logs/:habitId', (req, res) => {
  db.query('SELECT * FROM habit_log WHERE habit_id = ? ORDER BY log_date DESC',
    [req.params.habitId],
    (err, results) => {
      if (err) return res.status(500).json({ error: err.message });
      res.json(results);
    }
  );
});

app.post('/api/logs', (req, res) => {
  const { habit_id, log_date, status, note } = req.body;
  // upsert — update if already logged today
  db.query(
    'INSERT INTO habit_log (habit_id, log_date, status, note) VALUES (?,?,?,?) ON DUPLICATE KEY UPDATE status=?, note=?',
    [habit_id, log_date, status, note || '', status, note || ''],
    (err, result) => {
      if (err) {
        // fallback if no unique key set
        db.query(
          'INSERT INTO habit_log (habit_id, log_date, status, note) VALUES (?,?,?,?)',
          [habit_id, log_date, status, note || ''],
          (err2, r2) => {
            if (err2) return res.status(500).json({ error: err2.message });
            res.json({ log_id: r2.insertId });
          }
        );
        return;
      }
      res.json({ success: true });
    }
  );
});

// GOALS
app.get('/api/goals/:userId', (req, res) => {
  db.query('SELECT * FROM goal WHERE user_id = ? ORDER BY goal_id DESC',
    [req.params.userId],
    (err, results) => {
      if (err) return res.status(500).json({ error: err.message });
      res.json(results);
    }
  );
});

app.post('/api/goals', (req, res) => {
  const { goal_name, status, user_id } = req.body;
  db.query(
    'INSERT INTO goal (goal_name, status, user_id) VALUES (?,?,?)',
    [goal_name, status, user_id],
    (err, result) => {
      if (err) return res.status(500).json({ error: err.message });
      res.json({ goal_id: result.insertId });
    }
  );
});

const PORT = process.env.PORT || 3001;
app.listen(PORT, () => console.log(`🚀 Server running at http://localhost:${PORT}`));
