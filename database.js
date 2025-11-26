const fs = require('fs');
const path = require('path');
const crypto = require('crypto');

const DB_PATH = path.join(__dirname, 'votes.json');

// Initialize database file if not exists
function initDB() {
  if (!fs.existsSync(DB_PATH)) {
    const initialData = {
      votes: [],
      shares: []
    };
    fs.writeFileSync(DB_PATH, JSON.stringify(initialData, null, 2));
  }
}

// Read database
function readDB() {
  try {
    const data = fs.readFileSync(DB_PATH, 'utf8');
    return JSON.parse(data);
  } catch (err) {
    return { votes: [], shares: [] };
  }
}

// Write database
function writeDB(data) {
  fs.writeFileSync(DB_PATH, JSON.stringify(data, null, 2));
}

// Hash IP for privacy
function hashIP(ip) {
  return crypto.createHash('sha256').update(ip + (process.env.SALT || 'default-salt')).digest('hex');
}

// Get current day of week (1-7, Monday=1)
function getCurrentDay() {
  const now = new Date();
  const day = now.getDay();
  return day === 0 ? 7 : day; // Convert Sunday from 0 to 7
}

// Check if user already voted today
function hasVotedToday(ipHash) {
  const db = readDB();
  const today = getCurrentDay();
  
  return db.votes.some(vote => 
    vote.ip_hash === ipHash && vote.day_of_week === today
  );
}

// Record vote
function recordVote(songId, voteType, ip) {
  const ipHash = hashIP(ip);
  const today = getCurrentDay();
  
  if (hasVotedToday(ipHash)) {
    throw new Error('Already voted today');
  }

  const db = readDB();
  
  db.votes.push({
    id: db.votes.length + 1,
    song_id: songId,
    vote_type: voteType,
    ip_hash: ipHash,
    timestamp: Date.now(),
    day_of_week: today
  });
  
  writeDB(db);
}

// Get ranking for current week
function getWeeklyRanking() {
  const db = readDB();
  
  // Filter votes from days 1-6 only
  const weekVotes = db.votes.filter(v => v.day_of_week <= 6);
  
  // Group by song_id
  const ranking = {};
  
  weekVotes.forEach(vote => {
    if (!ranking[vote.song_id]) {
      ranking[vote.song_id] = {
        song_id: vote.song_id,
        likes: 0,
        dislikes: 0,
        total_votes: 0
      };
    }
    
    if (vote.vote_type === 'like') {
      ranking[vote.song_id].likes++;
    } else if (vote.vote_type === 'dislike') {
      ranking[vote.song_id].dislikes++;
    }
    
    ranking[vote.song_id].total_votes++;
  });
  
  // Convert to array and sort by likes DESC, dislikes ASC
  return Object.values(ranking).sort((a, b) => {
    if (b.likes !== a.likes) {
      return b.likes - a.likes;
    }
    return a.dislikes - b.dislikes;
  });
}

// Create share link
function createShare(songId) {
  const shareId = crypto.randomBytes(8).toString('hex');
  const db = readDB();
  
  db.shares.push({
    id: shareId,
    song_id: songId,
    created_at: Date.now()
  });
  
  writeDB(db);
  return shareId;
}

// Get share info
function getShare(shareId) {
  const db = readDB();
  return db.shares.find(share => share.id === shareId);
}

// Initialize on module load
initDB();

module.exports = {
  getCurrentDay,
  hasVotedToday,
  recordVote,
  getWeeklyRanking,
  createShare,
  getShare,
  hashIP
};
