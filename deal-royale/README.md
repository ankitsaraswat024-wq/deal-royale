# Deal Royale

An online multiplayer property-trading card game for 2–5 players, in the style of Monopoly Deal. It runs entirely in the browser.

- **No backend.** It's a static site (React + TypeScript + Vite + Tailwind + Framer Motion + Zustand).
- **Peer-to-peer.** The free **PeerJS Cloud** signaling service is used only to introduce browsers to each other. All game data then flows directly between browsers over **WebRTC data channels**.
- **The host's browser is the referee.** It validates every move and sends each player only their own hand.

> Original name, card names, district names and artwork. "Monopoly" and "Monopoly Deal" are trademarks of Hasbro; this project is not affiliated with them.

---

## Run it on your computer

Requires Node.js 18 or newer.

```bash
npm install
npm run dev
```

Open the address it prints (usually http://localhost:5173).

To try multiplayer on one computer, open the room's invite link in a second browser or a private/incognito window.

## Deploy for free (pick one)

### Option A: Netlify (drag and drop, easiest)
1. Run `npm install` and then `npm run build`. This creates a `dist` folder.
2. Go to **app.netlify.com/drop**.
3. Drag the `dist` folder onto the page.
4. Netlify gives you a link like `https://something.netlify.app`. Share it with your friends.

### Option B: Vercel (from GitHub, auto-updates)
1. Push this folder to a GitHub repository. Don't include `node_modules` or `dist`; `.gitignore` already excludes them.
2. Go to **vercel.com**, then **Add New → Project**, and import the repo.
3. Vercel detects Vite automatically: build command `npm run build`, output folder `dist`. Click **Deploy**.
4. Every time you push to GitHub, Vercel redeploys.

Netlify can also import from GitHub the same way. `netlify.toml` is already included.

## How to play online
1. Open the site and click **Create a room**. You become the **host**.
2. Click **Copy invite link** and send it to your friends, for example on WhatsApp.
3. Friends open the link, enter their name and join. Each clicks **I'm ready**.
4. The host clicks **Start game**.

**Rules in short:** Draw 2 cards each turn, then make up to 3 plays: bank money, lay properties, or play actions. Charge rent, steal with Swipe, Swap or Grand Heist, and block attacks with Veto. When you pay, no change is given. The first player to collect **3 complete property sets** wins.

## Connections: what to expect
- **The host must keep their tab open.** The host's browser runs the game.
  - If the host refreshes, the room re-opens automatically with the game state saved, and players reconnect within about a minute.
  - If the host closes the tab for good, the match ends and players are told so.
- **Guests can refresh or drop out briefly.** They rejoin the same seat automatically.
  - While a player is offline, the host can **skip their turn** or **decide for them** (accept the action, or pay automatically), so the game doesn't stall.
- **Connections aren't guaranteed on every network.** Peer-to-peer works on most home Wi-Fi and mobile data, but some strict office, school or hotel networks block it. If joining fails, the app explains why. Try a different network or a phone hotspot.
- For tougher networks, you can add your own TURN relay server (see below).

### Optional settings (environment variables)
Set these in Netlify or Vercel under "Environment variables", or in a `.env` file:

| Variable | Purpose |
|---|---|
| `VITE_TURN_URL`, `VITE_TURN_USERNAME`, `VITE_TURN_CREDENTIAL` | Use your own TURN server for networks that block direct connections |
| `VITE_PEER_HOST`, `VITE_PEER_PORT`, `VITE_PEER_PATH`, `VITE_PEER_SECURE` | Use a different PeerJS signaling server instead of PeerJS Cloud |

## Project structure
```
src/
  components/  cards/ game/ lobby/ players/ common/
  pages/       Home, Lobby (create/join), WaitingRoom, Game
  multiplayer/ peerService (PeerJS setup), connectionManager (host/guest links,
               heartbeats, reconnection), roomManager (host-side room + state),
               gameSync (guest move requests)
  game-engine/ cards/ (deck & card data), rules/, actions/, state/ (engine, views)
  store/       Zustand store
  hooks/ types/ animations/
scripts/simulate.ts  plays random games against the engine to check the rules
```

`npm run test:engine` plays 60 random games against the engine. It checks that no card is ever lost or duplicated, that sets stay valid, and that wins are real.
