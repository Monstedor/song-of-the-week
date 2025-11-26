const Database = require('better-sqlite3');
const crypto = require('crypto');
const path = require('path');

const db = new Database(path.join(__dirname, 'votes.db'));

// Initialize database
db.exec(`
  CREATE TABLE IF NOT EXISTS votes (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    song_id TEXT NOT NULL,
    vote_type TEXT NOT NULL CHECK(vote_type IN ('like', 'dislike')),
    ip_hash TEXT NOT NULL,
    timestamp INTEGER NOT NULL,
    day_of_week INTEGER NOT NULL
  );

  CREATE INDEX IF NOT EXISTS idx_votes_song ON votes(song_id);
  CREATE INDEX IF NOT EXISTS idx_votes_ip_day ON votes(ip_hash, day_of_week);
  CREATE INDEX IF NOT EXISTS idx_votes_timestamp ON votes(timestamp);

  CREATE TABLE IF NOT EXISTS shares (
    id TEXT PRIMARY KEY,
    song_id TEXT NOT NULL,
    created_at INTEGER NOT NULL
  );

  CREATE INDEX IF NOT EXISTS idx_shares_song ON shares(song_id);
`);

// Hash IP for privacy
function hashIP(ip) {
  return crypto.createHash('sha256').update(ip + process.env.SALT || 'default-salt').digest('hex');
}

// Get current day of week (1-7, Monday=1)
function getCurrentDay() {
  const now = new Date();
  const day = now.getDay();
  return day === 0 ? 7 : day; // Convert Sunday from 0 to 7
}

// Check if user already voted today
function hasVotedToday(ipHash) {
  const today = getCurrentDay();
  const stmt = db.prepare('SELECT COUNT(*) as count FROM votes WHERE ip_hash = ? AND day_of_week = ?');
  const result = stmt.get(ipHash, today);
  return result.count > 0;
}

// Record vote
function recordVote(songId, voteType, ip) {
  const ipHash = hashIP(ip);
  const today = getCurrentDay();
  
  if (hasVotedToday(ipHash)) {
    throw new Error('Already voted today');
  }

  const stmt = db.prepare('INSERT INTO votes (song_id, vote_type, ip_hash, timestamp, day_of_week) VALUES (?, ?, ?, ?, ?)');
  stmt.run(songId, voteType, ipHash, Date.now(), today);
}

// Get ranking for current week
function getWeeklyRanking() {
  const stmt = db.prepare(`
    SELECT 
      song_id,
      SUM(CASE WHEN vote_type = 'like' THEN 1 ELSE 0 END) as likes,
      SUM(CASE WHEN vote_type = 'dislike' THEN 1 ELSE 0 END) as dislikes,
      COUNT(*) as total_votes
    FROM votes
    WHERE day_of_week <= 6
    GROUP BY song_id
    ORDER BY likes DESC, dislikes ASC
  `);
  return stmt.all();
}

// Create share link
function createShare(songId) {
  const shareId = crypto.randomBytes(8).toString('hex');
  const stmt = db.prepare('INSERT INTO shares (id, song_id, created_at) VALUES (?, ?, ?)');
  stmt.run(shareId, songId, Date.now());
  return shareId;
}

// Get share info
function getShare(shareId) {
  const stmt = db.prepare('SELECT song_id, created_at FROM shares WHERE id = ?');
  return stmt.get(shareId);
}

module.exports = {
  getCurrentDay,
  hasVotedToday,
  recordVote,
  getWeeklyRanking,
  createShare,
  getShare,
  hashIP
};
