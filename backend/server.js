const express = require('express');
const cors = require('cors');
const rateLimit = require('express-rate-limit');
const db = require('./database');
const fs = require('fs');
const path = require('path');

const app = express();
const PORT = process.env.PORT || 3000;
app.set('trust proxy', 1);
// pusty komentarz
// Middleware
app.use(cors());
app.use(express.json());

// Share page route (before static files!)
app.get('/share/:id', async (req, res) => {
  try {
    const { id } = req.params;
    const share = db.getShare(id);
    
    if (!share) {
      return res.status(404).send('Share not found');
    }

    const song = songsData.songs?.find(s => s.id === share.song_id);
    
    if (!song) {
      return res.status(404).send('Song not found');
    }

    const ip = getClientIP(req);
    const ipHash = db.hashIP(ip);
    const hasVoted = db.hasVotedToday(ipHash);

    // HTML page with embedded song and voting
    const html = `
<!DOCTYPE html>
<html lang="pl">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>${song.title} - Song of the Week</title>
    <style>
        * { margin: 0; padding: 0; box-sizing: border-box; }
        body {
            font-family: 'Courier New', monospace;
            background: #0a0a0a;
            color: #ffffff;
            padding: 40px 20px;
            min-height: 100vh;
            display: flex;
            align-items: center;
            justify-content: center;
        }
        .container {
            max-width: 600px;
            width: 100%;
            background: rgba(255,255,255,0.02);
            border: 1px solid #404040;
            padding: 40px;
            text-align: center;
        }
        h1 {
            font-size: 2rem;
            font-weight: 300;
            margin-bottom: 10px;
        }
        .artist {
            color: #a0a0a0;
            margin-bottom: 30px;
            font-size: 0.9rem;
        }
        iframe {
            width: 100%;
            height: 150px;
            border: none;
            margin: 20px 0;
        }
        .vote-section {
            margin: 30px 0;
            padding: 30px 0;
            border-top: 1px solid #404040;
            border-bottom: 1px solid #404040;
        }
        .vote-prompt {
            font-size: 1.1rem;
            margin-bottom: 20px;
            color: #ffffff;
        }
        .vote-buttons {
            display: flex;
            gap: 15px;
            justify-content: center;
            flex-wrap: wrap;
        }
        button {
            padding: 12px 24px;
            background: transparent;
            color: #ffffff;
            border: 1px solid #ffffff;
            font-family: inherit;
            font-size: 1rem;
            cursor: pointer;
            transition: all 0.3s;
            min-width: 140px;
        }
        button:hover:not(:disabled) {
            background: #ffffff;
            color: #0a0a0a;
        }
        button:disabled {
            opacity: 0.3;
            cursor: not-allowed;
        }
        .vote-success {
            color: #4ade80;
            font-size: 1rem;
            margin: 20px 0;
        }
        .cta {
            margin-top: 30px;
        }
        .cta-text {
            color: #a0a0a0;
            margin-bottom: 20px;
            font-size: 0.9rem;
        }
        a {
            display: inline-block;
            padding: 12px 24px;
            background: transparent;
            color: #ffffff;
            border: 1px solid #ffffff;
            text-decoration: none;
            transition: all 0.3s;
        }
        a:hover {
            background: #ffffff;
            color: #0a0a0a;
        }
        .error {
            color: #f87171;
            margin-top: 10px;
        }
        @media (max-width: 600px) {
            .vote-buttons { flex-direction: column; }
            button { width: 100%; }
        }
    </style>
</head>
<body>
    <div class="container">
        <h1>🎵 ${song.title}</h1>
        <div class="artist">Wykonanie: ${song.artist}</div>
        
        <iframe src="${song.embedUrl}?autoplay=false" allowfullscreen></iframe>
        
        <div class="vote-section">
            ${hasVoted ? `
                <div class="vote-success">✓ Dziękujemy za głos!</div>
            ` : `
                <div class="vote-prompt">Podoba Ci się? Zagłosuj!</div>
                <div class="vote-buttons">
                    <button onclick="vote('like')">👍 Podoba mi się</button>
                    <button onclick="vote('dislike')">👎 Nie podoba mi się</button>
                </div>
                <div id="error" class="error"></div>
            `}
        </div>
        
        <div class="cta">
            <div class="cta-text">
                Ta piosenka jest częścią "Song of the Week"
            </div>
            <a href="/">Zobacz pozostałe wersje tej piosenki →</a>
        </div>
    </div>
    
    <script>
        async function vote(voteType) {
            const buttons = document.querySelectorAll('button');
            buttons.forEach(btn => btn.disabled = true);
            
            try {
                const response = await fetch('/api/vote', {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({ 
                        songId: '${song.id}', 
                        voteType: voteType 
                    })
                });
                
                const data = await response.json();
                
                if (response.ok) {
                    location.reload();
                } else {
                    document.getElementById('error').textContent = data.error || 'Błąd głosowania';
                    buttons.forEach(btn => btn.disabled = false);
                }
            } catch (err) {
                document.getElementById('error').textContent = 'Błąd połączenia';
                buttons.forEach(btn => btn.disabled = false);
            }
        }
    </script>
</body>
</html>
    `;
    
    res.send(html);
  } catch (err) {
    res.status(500).send('Error loading share');
  }
});


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

// GET /api/today - Get today's song + previous days of this week
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

    // Get previous days of this week (days 1 to current_day-1)
    const previousDays = [];
    for (let i = 1; i < day; i++) {
      const prevSong = songsData.songs?.[i - 1];
      if (prevSong) {
        previousDays.push(prevSong);
      }
    }

    res.json({
      day,
      song,
      hasVoted,
      previousDays
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
