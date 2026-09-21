# HereBus' A Lead: Cutthroat Pinochle

Live at pinochle.get2.one

An interactive web adaptation of California prison-style cutthroat pinochle ("Behind the Wall" rules), built around character-driven AI opponents and a custom cutscene engine rather than a plain card-game UI.

Currently an active entry in Emergent's Builder Fest contest (partnered with Kevin O'Leary). This link is offered as a no-signup-required way to play, separate from the contest's own voting flow.

What makes this more than a card game
"Pick Your Hustler" — a 5-character roster (G2, DooLow, PapaCap, Scrap, BabyBoy), each a real face reimagined in GTA San Andreas-style art, with an Opponent Picker letting the player hand-pick both AI rivals instead of getting random ones.
Yard Reels — a custom cutscene engine with character-specific animations, a cooldown/priority throttling system (so signature moments don't spam), and a "Play All" slideshow view for browsing them outside of a live hand.
Reactive character AI — opponents aren't static; behavior and cutscene triggers respond to what's actually happening in the hand.
Stack
FastAPI (Python) — backend, binds 0.0.0.0:8001, all routes under an /api prefix
MongoDB (via motor, async driver) — game/session data
React (Create React App via craco) — frontend
Emergent — current build/iteration environment and hosting; this repo is a GitHub mirror of what Emergent deploys
Run locally

This is two services running side by side — backend and frontend each need their own terminal.

Backend:

bash
cd backend
pip install -r requirements.txt

Create backend/.env with:

MONGO_URL="<your MongoDB connection string>"
DB_NAME="<your database name>"

Then run:

bash
uvicorn server:app --host 0.0.0.0 --port 8001 --reload

Frontend:

bash
cd frontend
npm install

Create frontend/.env with:

REACT_APP_BACKEND_URL="http://localhost:8001"

Then run:

bash
npm start
Repo note

Active development currently happens through Emergent's chat-based build environment, which pushes here as a GitHub mirror. Code changes made directly against this repo won't be reflected on Emergent until pulled back in there.are your Instructions
