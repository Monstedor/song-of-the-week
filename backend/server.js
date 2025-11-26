const express = require('express');
const cors = require('cors');
const rateLimit = require('express-rate-limit');
const db = require('./database');
const fs = require('fs');
const path = require('path');

const app = express();
const PORT = process.env.PORT || 3000;

// Middleware
app.use(cors());
app.use(express.json());

// Serve frontend files
app.use(express.static(path.join(__dirname, '../frontend')));

// Rate limiting
const limiter = rateLimit({
  windowMs: 60 * 1000, // 1 minute
  max: 20, // 20 requests per minute
  message: 'Too many requests'
});
app.use('/api/', limiter);

// Load songs data
const songsPath = path.join(__dirname, '../data/songs.json');
let songsData = {};
try {
  songsData = JSON.parse(fs.readFileSync(songsPath, 'utf8'));
} catch (err) {
  console.error('Error loading songs.json:', err);
}

// Get client IP
function getClientIP(req) {
  return req.headers['x-forwarded-for']?.split(',')[0].trim() || 
         req.headers['x-real-ip'] || 
         req.connection.remoteAddress || 
         req.socket.remoteAddress ||
         '0.0.0.0';
}

// Routes

// GET /api/today - Get today's song
app.get('/api/today', (req, res) => {
  try {
    const day = db.getCurrentDay();
    const ip = getClientIP(req);
    const ipHash = db.hashIP(ip);
    const hasVoted = db.hasVotedToday(ipHash);
    
    const song = songsData.songs?.[day - 1];
    
    if (!song) {
      return res.status(404).json({ error: 'No song for today' });
    }

    res.json({
      day,
      song,
      hasVoted
    });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// POST /api/vote - Record a vote
app.post('/api/vote', (req, res) => {
  try {
    const { songId, voteType } = req.body;
    
    if (!songId || !voteType) {
      return res.status(400).json({ error: 'Missing songId or voteType' });
    }
    
    if (!['like', 'dislike'].includes(voteType)) {
      return res.status(400).json({ error: 'Invalid voteType' });
    }

    const ip = getClientIP(req);
    db.recordVote(songId, voteType, ip);
    
    res.json({ success: true, message: 'Vote recorded' });
  } catch (err) {
    if (err.message === 'Already voted today') {
      return res.status(400).json({ error: 'Already voted today' });
    }
    res.status(500).json({ error: err.message });
  }
});

// GET /api/ranking - Get weekly ranking
app.get('/api/ranking', (req, res) => {
  try {
    const day = db.getCurrentDay();
    
    if (day !== 7) {
      return res.status(403).json({ error: 'Ranking only available on day 7' });
    }

    const ranking = db.getWeeklyRanking();
    
    // Enrich with song data
    const enrichedRanking = ranking.map(r => {
      const song = songsData.songs?.find(s => s.id === r.song_id);
      return {
        ...r,
        song: song || { id: r.song_id, title: 'Unknown' }
      };
    });
    
    res.json({ ranking: enrichedRanking });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// POST /api/share - Create share link
app.post('/api/share', (req, res) => {
  try {
    const { songId } = req.body;
    
    if (!songId) {
      return res.status(400).json({ error: 'Missing songId' });
    }

    const shareId = db.createShare(songId);
    const shareUrl = `${req.protocol}://${req.get('host')}/share/${shareId}`;
    
    res.json({ shareUrl, shareId });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// GET /api/share/:id - Get share info
app.get('/api/share/:id', (req, res) => {
  try {
    const { id } = req.params;
    const share = db.getShare(id);
    
    if (!share) {
      return res.status(404).json({ error: 'Share not found' });
    }

    const song = songsData.songs?.find(s => s.id === share.song_id);
    
    res.json({
      song: song || { id: share.song_id },
      createdAt: share.created_at
    });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// Health check
app.get('/health', (req, res) => {
  res.json({ status: 'ok', day: db.getCurrentDay() });
});

// Start server
app.listen(PORT, () => {
  console.log(`Server running on port ${PORT}`);
  console.log(`Current day: ${db.getCurrentDay()}`);
});
