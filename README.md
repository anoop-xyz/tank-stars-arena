# Tank Stars Arena

A 2D turn-based multiplayer artillery battle game inspired by Tank Stars.

- **Frontend:** React + TypeScript + Phaser 3 (Vite) — deploys to Vercel
- **Backend:** Node + Express + Socket.IO (authoritative) — deploys to Render
- **Physics:** Matter.js (client render) + deterministic server simulation
- **Mode:** Room multiplayer (create/join with 6-digit code)

## Monorepo layout

```
/backend    Authoritative game server (rooms, turns, physics, damage)
/frontend   React shell + Phaser game client
```

## Local development

### Backend
```bash
cd backend
npm install
npm run dev        # starts on http://localhost:3001
```

### Frontend
```bash
cd frontend
npm install
npm run dev        # starts on http://localhost:5173
```

Set `VITE_SERVER_URL` in `frontend/.env` to point at the backend (defaults to `http://localhost:3001`).

## Deployment

- **Backend → Render:** uses `backend/render.yaml`. Build `npm install && npm run build`, start `npm start`.
- **Frontend → Vercel:** root directory `frontend`, framework preset Vite. Set `VITE_SERVER_URL` env var to the Render URL.

## Architecture notes

The server is **authoritative**: it owns terrain, tank positions, health, turn order, the
turn timer, projectile simulation, and damage resolution. Clients send only *intents*
(`aim`, `fire`) and render the authoritative state the server streams back. This prevents
client-side cheating (no client can claim a hit or edit its own health).

See `backend/src` for the game core and `frontend/src` for scenes, entities, and UI.

## Status

This is a working, runnable foundation with the full game loop, networking, physics,
damage model, destructible terrain, and a data-driven 15-weapon registry. Art and audio
are wired through asset-key hooks (drop files into `frontend/public/assets`) so the game
runs with generated primitives today and upgrades to custom art without code changes.
