# Book Reader

Book Reader is a Flask and React app for exploring book summaries from Project Gutenberg titles.

- Search by title, author, language, or subject.
- Read sectioned summaries and open the original books on Project Gutenberg.
- Get recommendations based on reading history and save reading progress.
- Listen with browser speech controls for voice, speed, and section.
- Sign in to sync progress across devices using the same server.

## Requirements

- Python 3.10+
- Node.js 20.19+ or 22.12+

## Run locally

From the repository root:

```sh
python3 -m venv .venv
. .venv/bin/activate
pip install -r app/backend/requirements.txt
flask --app app.backend.app:create_app run
```

In a second terminal:

```sh
cd app/frontend
npm ci
npm start
```

Open <http://127.0.0.1:5173>.

## Test

```sh
python3 -m unittest discover -s app/backend/tests -v
cd app/frontend
npm test
npm run build
```

## Deploy

Build the frontend with `cd app/frontend && npm ci && npm run build`. Serve the Flask app with a production WSGI server behind HTTPS. Set a private, stable `READER_SECRET_KEY` and `READER_SECURE_COOKIES=1`. Back up `app/backend/instance/users.db` to preserve accounts and reading progress.

Accounts do not currently support email verification or password reset. Add those before opening signups to the public.
