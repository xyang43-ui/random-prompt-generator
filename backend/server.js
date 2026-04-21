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

// --- Unified Storage Path ---
// On Railway, /tmp is always writable. Let's use it as a fallback or primary for production.
const baseStorageDir = process.env.NODE_ENV === 'production' 
    ? '/tmp/random-untitled-storage' 
    : path.join(__dirname, 'storage');

const uploadsDir = path.join(baseStorageDir, 'uploads');
const dbDir = path.join(baseStorageDir, 'data');

console.log('Target Storage Directory:', baseStorageDir);

try {
  if (!fs.existsSync(baseStorageDir)) fs.mkdirSync(baseStorageDir, { recursive: true });
  if (!fs.existsSync(uploadsDir)) fs.mkdirSync(uploadsDir, { recursive: true });
  if (!fs.existsSync(dbDir)) fs.mkdirSync(dbDir, { recursive: true });
  console.log('Directories verified/created at:', baseStorageDir);
} catch (err) {
  console.error('CRITICAL: Failed to create storage directories:', err.message);
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

const upload = multer({ 
  storage: storage,
  limits: { fileSize: 10 * 1024 * 1024 } // 10MB limit
});

// Routes
app.get('/api/prompts', (req, res) => {
  console.log('GET /api/prompts requested');
  db.all('SELECT * FROM prompts ORDER BY id DESC', [], (err, rows) => {    
    if (err) {
      console.error('DB Error (GET):', err.message);
      return res.status(500).json({ error: 'Database error', details: err.message });
    }
    res.json(rows);
  });
});

app.post('/api/prompts', (req, res) => {
  console.log('POST /api/prompts requested');
  
  upload.single('media')(req, res, function (err) {
    if (err instanceof multer.MulterError) {
      console.error('Multer Error:', err.message);
      return res.status(400).json({ error: 'File upload error', details: err.message });
    } else if (err) {
      console.error('Unknown Upload Error:', err.message);
      return res.status(500).json({ error: 'Upload failed', details: err.message });
    }

    const { prompt_text, response_text } = req.body;
    const file = req.file;

    if (!prompt_text) {
        return res.status(400).json({ error: 'Missing prompt_text (Received: ' + JSON.stringify(req.body) + ')' });
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
        return res.status(500).json({ error: 'Database insertion failed', details: err.message });
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
});

// Global Error Handler
app.use((err, req, res, next) => {
  console.error('Global Error Handler:', err.stack);
  res.status(500).json({ 
    error: 'Internal Server Error', 
    details: err.message,
    stack: process.env.NODE_ENV === 'production' ? '🥞' : err.stack 
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
