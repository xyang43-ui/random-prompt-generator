const express = require('express');
const cors = require('cors');
const sqlite3 = require('sqlite3').verbose();
const multer = require('multer');
const path = require('path');
const fs = require('fs');

const app = express();
const port = process.env.PORT || 3001;

// Middleware
const frontendUrl = process.env.FRONTEND_URL || "http://localhost:5173";
app.use(cors({
  origin: frontendUrl,
  methods: ["GET", "POST", "DELETE"],
  credentials: true
}));

app.use(express.json());

// --- Unified Storage Path for Railway Free Tier ---
const baseStorageDir = process.env.NODE_ENV === 'production' ? '/app/storage' : __dirname;
const uploadsDir = path.join(baseStorageDir, 'uploads');
const dbDir = path.join(baseStorageDir, 'data');

if (!fs.existsSync(uploadsDir)) {
  fs.mkdirSync(uploadsDir, { recursive: true });
}
if (!fs.existsSync(dbDir)) {
  fs.mkdirSync(dbDir, { recursive: true });
}

app.use('/uploads', express.static(uploadsDir));      

// Database Setup
const dbPath = path.join(dbDir, 'database.sqlite');
const db = new sqlite3.Database(dbPath, (err) => {
  if (err) {
    console.error('Error opening database', err.message);
  } else {
    console.log('Connected to the SQLite database at:', dbPath);
    db.run(`CREATE TABLE IF NOT EXISTS prompts (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      prompt_text TEXT NOT NULL,
      response_text TEXT,
      media_url TEXT,
      media_type TEXT NOT NULL
    )`, (err) => {
      if (err) {
        console.error('Error creating table', err.message);
      }
    });
  }
});

const storage = multer.diskStorage({
  destination: (req, file, cb) => {
    cb(null, uploadsDir);
  },
  filename: (req, file, cb) => {
    const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1E9);
    cb(null, uniqueSuffix + path.extname(file.originalname));
  }
});

const upload = multer({ storage: storage });

// Routes
app.get('/api/prompts', (req, res) => {
  db.all('SELECT * FROM prompts ORDER BY id DESC', [], (err, rows) => {    
    if (err) {
      res.status(500).json({ error: err.message });
      return;
    }
    res.json(rows);
  });
});

app.post('/api/prompts', upload.single('media'), (req, res) => {
  const { prompt_text, response_text } = req.body;
  const file = req.file;

  let media_url = "";
  let media_type = "text";

  if (file) {
    const protocol = req.protocol;
    const host = req.get('host');
    const finalProtocol = process.env.NODE_ENV === 'production' ? 'https' : protocol;
    media_url = `${finalProtocol}://${host}/uploads/${file.filename}`;
    
    if (file.mimetype.startsWith('image/')) {
      media_type = 'image';
    } else if (file.mimetype.startsWith('video/')) {
      media_type = 'video';
    } else if (file.mimetype.startsWith('audio/')) {
      media_type = 'audio';
    }
  }

  const sql = 'INSERT INTO prompts (prompt_text, response_text, media_url, media_type) VALUES (?, ?, ?, ?)';
  const params = [prompt_text, response_text || "", media_url, media_type];

  db.run(sql, params, function(err) {
    if (err) {
      res.status(500).json({ error: err.message });
      return;
    }
    res.json({
      id: this.lastID,
      prompt_text,
      response_text,
      media_url,
      media_type
    });
  });
});

app.delete('/api/prompts/:id', (req, res) => {
  const { id } = req.params;
  
  db.get('SELECT media_url FROM prompts WHERE id = ?', [id], (err, row) => {
    if (err) {
      return res.status(500).json({ error: err.message });
    }
    if (!row) {
      return res.status(404).json({ error: 'Prompt not found' });
    }

    const filename = row.media_url.split('/').pop();
    const filePath = path.join(uploadsDir, filename);

    db.run('DELETE FROM prompts WHERE id = ?', [id], function(err) {
      if (err) {
        return res.status(500).json({ error: err.message });
      }

      if (fs.existsSync(filePath)) {
        fs.unlinkSync(filePath);
      }
      
      res.json({ message: 'Deleted successfully', id });
    });
  });
});

app.listen(port, () => {
  console.log(`Server running on port ${port}`);
});
