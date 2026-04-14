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
  methods: ["GET", "POST"],
  credentials: true
}));

app.use(express.json());

// --- Persistent Paths for Railway ---
// If Root Directory is /backend, Railway puts everything in /app
const uploadsDir = process.env.NODE_ENV === 'production' ? '/app/uploads' : path.join(__dirname, 'uploads');
const dbDir = process.env.NODE_ENV === 'production' ? '/app/data' : __dirname;

// Ensure directories exist
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
      media_url TEXT NOT NULL,
      media_type TEXT NOT NULL
    )`, (err) => {
      if (err) {
        console.error('Error creating table', err.message);
      }
    });
  }
});

// Multer Storage Configuration
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
  const { prompt_text } = req.body;
  const file = req.file;

  if (!file) {
    return res.status(400).json({ error: 'Please upload a file' });        
  }

  // Construct dynamic media URL based on the request host
  const protocol = req.protocol;
  const host = req.get('host');
  // Handle https for production
  const finalProtocol = process.env.NODE_ENV === 'production' ? 'https' : protocol;
  const media_url = `${finalProtocol}://${host}/uploads/${file.filename}`;
  
  let media_type = 'unknown';

  if (file.mimetype.startsWith('image/')) {
    media_type = 'image';
  } else if (file.mimetype.startsWith('video/')) {
    media_type = 'video';
  } else if (file.mimetype.startsWith('audio/')) {
    media_type = 'audio';
  }

  const sql = 'INSERT INTO prompts (prompt_text, media_url, media_type) VALUES (?, ?, ?)';
  const params = [prompt_text, media_url, media_type];

  db.run(sql, params, function(err) {
    if (err) {
      res.status(500).json({ error: err.message });
      return;
    }
    res.json({
      id: this.lastID,
      prompt_text,
      media_url,
      media_type
    });
  });
});

app.listen(port, () => {
  console.log(`Server running on port ${port}`);
});
