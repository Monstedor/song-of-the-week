const API_URL = 'https://song-of-the-week-i933.onrender.com/api';

async function init() {
    try {
        const response = await fetch(`${API_URL}/today`);
        const data = await response.json();
        
        document.getElementById('current-day').textContent = data.day;
        
        if (data.day === 7) {
            showRanking();
        } else {
            showSong(data.song, data.hasVoted);
        }
    } catch (err) {
        showError('Nie udało się załadować danych');
        console.error(err);
    }
}

function showSong(song, hasVoted) {
    const main = document.getElementById('main-content');
    
    main.innerHTML = `
        <div class="song-card">
            <h2 class="song-title">${song.title}</h2>
            <div class="song-artist">Wykonanie: ${song.artist}</div>
            
            <div class="song-embed">
                <iframe src="${song.embedUrl}?autoplay=false" allowfullscreen></iframe>
            </div>
            
            ${hasVoted ? `
                <div class="vote-success">✓ Dziękujemy za głos!</div>
            ` : `
                <div class="vote-buttons">
                    <button class="btn btn-like" onclick="vote('${song.id}', 'like')">
                        👍 Podoba mi się
                    </button>
                    <button class="btn btn-dislike" onclick="vote('${song.id}', 'dislike')">
                        👎 Nie podoba mi się
                    </button>
                </div>
            `}
            
            ${hasVoted ? `
                <div class="share-section">
                    <button class="btn" onclick="shareSong('${song.id}')">
                        🔗 Udostępnij tę wersję
                    </button>
                </div>
            ` : ''}
        </div>
    `;
}

async function vote(songId, voteType) {
    try {
        const buttons = document.querySelectorAll('.vote-buttons button');
        buttons.forEach(btn => btn.disabled = true);
        
        const response = await fetch(`${API_URL}/vote`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ songId, voteType })
        });
        
        const data = await response.json();
        
        if (response.ok) {
            location.reload();
        } else {
            alert(data.error || 'Błąd głosowania');
            buttons.forEach(btn => btn.disabled = false);
        }
    } catch (err) {
        alert('Błąd połączenia');
        console.error(err);
    }
}

async function showRanking() {
    try {
        const response = await fetch(`${API_URL}/ranking`);
        const data = await response.json();
        
        const main = document.getElementById('main-content');
        
        main.innerHTML = `
            <div class="song-card">
                <h2>🏆 Ranking tygodnia</h2>
                <p style="color: var(--text-dim); margin-bottom: 30px;">
                    Oto jak głosowaliście w mijającym tygodniu:
                </p>
                
                <ol class="ranking-list">
                    ${data.ranking.map((item, index) => `
                        <li class="ranking-item">
                            <div class="ranking-position">#${index + 1}</div>
                            <div class="ranking-info">
                                <div class="ranking-title">${item.song.title}</div>
                                <div class="ranking-stats">
                                    <span class="likes">👍 ${item.likes}</span> · 
                                    <span class="dislikes">👎 ${item.dislikes}</span> · 
                                    <span>Razem: ${item.total_votes}</span>
                                </div>
                            </div>
                        </li>
                    `).join('')}
                </ol>
            </div>
        `;
    } catch (err) {
        showError('Nie udało się załadować rankingu');
        console.error(err);
    }
}

async function shareSong(songId) {
    try {
        const response = await fetch(`${API_URL}/share`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ songId })
        });
        
        const data = await response.json();
        
        document.getElementById('share-url').value = data.shareUrl;
        document.getElementById('share-modal').classList.add('active');
    } catch (err) {
        alert('Błąd tworzenia linku');
        console.error(err);
    }
}

function closeShareModal() {
    document.getElementById('share-modal').classList.remove('active');
}

function copyShareLink() {
    const input = document.getElementById('share-url');
    input.select();
    document.execCommand('copy');
    
    document.getElementById('share-success').textContent = '✓ Skopiowano!';
    setTimeout(() => {
        document.getElementById('share-success').textContent = '';
    }, 2000);
}

function showError(message) {
    document.getElementById('main-content').innerHTML = `
        <div style="text-align: center; padding: 60px 20px; color: var(--error);">
            ${message}
        </div>
    `;
}

init();
