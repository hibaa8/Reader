# Book Reader

Book Reader is a Flask and React app for browsing 103 Project Gutenberg books. Ten featured books have source-aligned reading guides with a quick take, chapter or act summaries, and key ideas. The 88 usable older summaries now appear in the same sectional layout, labeled as unreviewed because their content has not been checked against the original books. Five catalog records contain no usable summary and are marked unavailable. Search by title, author, language, or subject; filter by subject; and open a book for its guide or summary. Save reading progress, get recommendations from completed books and substantial reading, and listen with voice, speed, and section controls. Catalog covers use genre colors. The app can run without an API key after dependencies are installed, though source links and Amazon links require internet access.

Anonymous reading history is stored in this browser's local storage. Signing up imports it into a private account database and makes progress available on other devices when the same server is deployed. Narration uses voices supplied by the browser and operating system; availability and voice quality vary. The player reads summary text aloud and does not record microphone audio. When a remote cover image is unavailable, the app displays a text cover instead.

The source-aligned guides cover *Alice's Adventures in Wonderland* (12 chapters), *A Christmas Carol* (five staves), *The Great Gatsby* (nine chapters), *The Strange Case of Dr. Jekyll and Mr. Hyde* (ten chapters), *The Importance of Being Earnest* (three acts), *A Doll's House* (three acts), *The Call of the Wild* (seven chapters), *The Time Machine* (16 chapters), *The Wind in the Willows* (12 chapters), and *The Canterville Ghost* (seven sections). The four newly fetched sources came from GITenberg's mirrors of Project Gutenberg texts because Gutenberg's direct text endpoint returned HTTP 503 during this update. Each guide links to its Gutenberg edition, and the new source records include the mirror URL and SHA-256 of the text reviewed. The summaries are paraphrases, not extracts. Guide data lives in `app/backend/data/reading_guides.json`; the four added catalog entries live in `app/backend/data/added_books.json`; the bundled catalog database is not modified.

## Requirements

- Python 3.10 or newer
- Node.js 20.19 or newer (or 22.12 or newer)

## Run locally

From the repository root, install backend dependencies in a virtual environment:

```sh
python3 -m venv .venv
. .venv/bin/activate
pip install -r app/backend/requirements.txt
```

In one terminal, run the Flask API:

```sh
. .venv/bin/activate
flask --app app.backend.app:create_app run
```

In another terminal, run the frontend development server:

```sh
cd app/frontend
npm ci
npm start
```

Open <http://127.0.0.1:5173>. Vite proxies `/api` to Flask on port 5000.

Run the recommendation checks with `cd app/frontend && npm test`.
Run account and API checks with `.venv/bin/python -m unittest discover -s app/backend/tests -v` from the repository root.

## Build and serve

```sh
cd app/frontend
npm ci
npm run build
cd ../..
. .venv/bin/activate
flask --app app.backend.app:create_app run
```

Open <http://127.0.0.1:5000>. Flask serves the built frontend from `app/frontend/build`. For a public deployment, run the Flask app behind a production WSGI server and HTTPS reverse proxy. Do not use Flask's development server as a public service.

Account data is stored in `app/backend/instance/users.db`, separate from the committed book catalog. This file and the locally generated session-signing key are ignored by Git. Back them up if you need to preserve accounts. Set a stable, private `READER_SECRET_KEY` and `READER_SECURE_COOKIES=1` for an HTTPS deployment. Do not reuse a development secret. The current account flow does not include email verification or password reset; add those before inviting untrusted public signups.

## API

- `GET /api/books` lists books and metadata. Optional `subject` query parameter filters subjects.
- `GET /api/books/<id>` returns a `guide` for usable summaries, with `summary_reviewed` indicating source review; unknown IDs return JSON with HTTP 404. The catalog list includes `has_guide` to identify the ten source-aligned guides.
- `GET /api/auth/me` returns the session user and a CSRF token. Account and progress mutations require that token in `X-CSRF-Token`.
- `POST /api/auth/signup`, `/api/auth/login`, `/api/auth/logout` manage a signed session.
- `GET /api/progress`, `PUT /api/progress/<id>`, and `POST /api/progress/import` store private reading progress.

The bundled SQLite database is read by default and contains the original catalog and generated summaries. Older HTML is parsed into plain text on the server and escaped by React when displayed. No credentials are required to browse the catalog.

## Optional data generation

`app/backend/scripts/add_summaries.py` is separate from the browsing app. It requires a `GEMINI_API_KEY` in `app/backend/.env` plus the optional packages noted in `app/backend/requirements.txt`. It makes requests to external services; review those services' terms and costs before running it. The generated summaries already bundled with this repository do not require this script.
