# 🎵 Song of the Week

Aplikacja do głosowania na różne wersje tej samej piosenki przez tydzień.

## Jak działa

- **Dni 1-6:** Każdego dnia nowa wersja piosenki, użytkownik głosuje 👍/👎
- **Dzień 7:** Ranking tygodnia - która wersja była najpopularniejsza
- **Udostępnianie:** Polubione piosenki można udostępnić znajomym

## Technologie

- Frontend: HTML, CSS, Vanilla JavaScript
- Backend: Node.js, Express, SQLite
- Hosting: GitHub Pages (frontend) + Railway (backend)

## Struktura

```
song-of-the-week/
├── backend/       # Node.js API
├── frontend/      # Strona WWW
└── data/          # Piosenki na tydzień
```

## API Endpoints

- `GET /api/today` - Dzisiejsza piosenka
- `POST /api/vote` - Zagłosuj
- `GET /api/ranking` - Ranking (tylko dzień 7)
- `POST /api/share` - Utwórz link do udostępnienia
- `GET /api/share/:id` - Dane udostępnionej piosenki

## Development

Backend:
```bash
cd backend
npm install
npm start
```

Frontend: Otwórz `frontend/index.html` w przeglądarce.

## Deploy

Backend deploys automatically to Railway on push to main.
Frontend deploys to GitHub Pages.
