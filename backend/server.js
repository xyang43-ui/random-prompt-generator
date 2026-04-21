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
const allowedOrigins = frontendUrl.split(',').map(url => url.trim());
console.log('Backend starting...');
console.log('Allowed Origins:', allowedOrigins);

app.use(cors({
  origin: function (origin, callback) {
    // allow requests with no origin (like mobile apps or curl requests)
    if (!origin) return callback(null, true);
    if (allowedOrigins.indexOf(origin) !== -1 || allowedOrigins.includes('*')) {
      callback(null, true);
    } else {
      console.warn(`CORS blocked for origin: ${origin}`);
      callback(new Error('Not allowed by CORS'));
    }
  },
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
console.log('Database path:', dbPath);

const db = new sqlite3.Database(dbPath, (err) => {
  if (err) {
    console.error('CRITICAL: Error opening database', err.message);
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
        console.error('CRITICAL: Error creating table', err.message);
      } else {
        console.log('Database table verified/created.');
      }
    });
  }
});

const storage = multer.diskStorage({
  destination: (req, file, cb) => {
    if (!fs.existsSync(uploadsDir)) {
        fs.mkdirSync(uploadsDir, { recursive: true });
    }
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
  console.log('GET /api/prompts requested');
  db.all('SELECT * FROM prompts ORDER BY id DESC', [], (err, rows) => {    
    if (err) {
      console.error('DB Error (GET):', err.message);
      res.status(500).json({ error: 'Database error', details: err.message });
      return;
    }
    res.json(rows);
  });
});

app.post('/api/prompts', upload.single('media'), (req, res) => {
  console.log('POST /api/prompts requested');
  const { prompt_text, response_text } = req.body;
  const file = req.file;

  if (!prompt_text) {
      return res.status(400).json({ error: 'Missing prompt_text' });
  }

  let media_url = "";
  let media_type = "text";

  if (file) {
    const host = req.get('host');
    const finalProtocol = process.env.NODE_ENV === 'production' ? 'https' : req.protocol;
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
      console.error('DB Error (POST):', err.message);
      res.status(500).json({ error: 'Database insertion failed', details: err.message });
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
