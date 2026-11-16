import os
import tempfile
import unittest

from app.backend.app import create_app


class AuthAndProgressTests(unittest.TestCase):
    def setUp(self):
        self.directory = tempfile.TemporaryDirectory()
        catalog = os.path.abspath('app/backend/instance/summaries.db')
        users = os.path.join(self.directory.name, 'users.db')
        self.app = create_app({
            'TESTING': True,
            'SECRET_KEY': 'test-secret-only',
            'SQLALCHEMY_DATABASE_URI': f'sqlite:///{catalog}',
            'SQLALCHEMY_BINDS': {'users': f'sqlite:///{users}'},
        })
        self.client = self.app.test_client()
        self.csrf = self.client.get('/api/auth/me').json['csrfToken']

    def tearDown(self):
        self.directory.cleanup()

    def mutate(self, path, data=None, method='post', client=None, token=None):
        client = client or self.client
        headers = {'X-CSRF-Token': token or self.csrf}
        return getattr(client, method)(path, json=data or {}, headers=headers)

    def test_signup_login_logout_and_csrf(self):
        self.assertEqual(self.client.post('/api/auth/signup', json={}).status_code, 403)
        response = self.mutate('/api/auth/signup', {
            'name': 'Reader', 'email': 'Reader@example.com', 'password': 'a-long-password-123',
        })
        self.assertEqual(response.status_code, 201)
        self.assertEqual(response.json['user']['email'], 'reader@example.com')
        self.csrf = response.json['csrfToken']
        self.assertEqual(self.client.get('/api/auth/me').json['user']['name'], 'Reader')
        self.assertEqual(self.mutate('/api/auth/logout').status_code, 200)
        self.csrf = self.client.get('/api/auth/me').json['csrfToken']
        self.assertIsNone(self.client.get('/api/auth/me').json['user'])
        self.assertEqual(self.mutate('/api/auth/login', {'email': 'reader@example.com', 'password': 'wrong'}).status_code, 401)
        response = self.mutate('/api/auth/login', {'email': 'reader@example.com', 'password': 'a-long-password-123'})
        self.assertEqual(response.status_code, 200)

    def test_progress_is_private_and_validated(self):
        self.assertEqual(self.client.get('/api/progress').status_code, 401)
        response = self.mutate('/api/auth/signup', {
            'name': 'One', 'email': 'one@example.com', 'password': 'a-long-password-123',
        })
        self.csrf = response.json['csrfToken']
        self.assertEqual(self.mutate('/api/progress/1', {'percent': 37.5, 'completed': False}, method='put').status_code, 200)
        self.assertEqual(next(row['percent'] for row in self.client.get('/api/progress').json if row['bookId'] == 1), 37.5)
        self.assertEqual(self.mutate('/api/progress/100', {'percent': 42, 'completed': False}, method='put').status_code, 200)
        self.assertEqual(self.mutate('/api/progress/1', {'percent': 400, 'completed': False}, method='put').status_code, 400)
        self.assertEqual(self.mutate('/api/progress/99999', {'percent': 1, 'completed': False}, method='put').status_code, 404)
        other = self.app.test_client()
        other_csrf = other.get('/api/auth/me').json['csrfToken']
        signup = self.mutate('/api/auth/signup', {'name': 'Two', 'email': 'two@example.com', 'password': 'another-long-password'}, client=other, token=other_csrf)
        self.assertEqual(signup.status_code, 201)
        self.assertEqual(other.get('/api/progress').json, [])

    def test_import_merges_anonymous_progress(self):
        response = self.mutate('/api/auth/signup', {
            'name': 'Reader', 'email': 'reader@example.com', 'password': 'a-long-password-123',
        })
        self.csrf = response.json['csrfToken']
        self.mutate('/api/progress/1', {'percent': 25, 'completed': False}, method='put')
        response = self.mutate('/api/progress/import', [{'bookId': 1, 'percent': 60, 'completed': False}])
        self.assertEqual(response.status_code, 200)
        self.assertEqual(response.json[0]['percent'], 60)

    def test_source_guides_and_overviews(self):
        expected = {10: (11, 12), 23: (46, 5), 16: (64317, 9), 29: (43, 10), 28: (844, 3), 24: (2542, 3),
                    100: (215, 7), 101: (35, 16), 102: (289, 12), 103: (14522, 7)}
        listed = {book['id']: book for book in self.client.get('/api/books').json}
        self.assertEqual(len(listed), 103)
        for book_id, (gutenberg_id, sections) in expected.items():
            with self.subTest(book_id=book_id):
                book = self.client.get(f'/api/books/{book_id}').json
                self.assertTrue(book['summary_reviewed'])
                self.assertIsNone(book['summary'])
                self.assertEqual(book['source_url'], f'https://www.gutenberg.org/ebooks/{gutenberg_id}')
                self.assertEqual(len(book['guide']['sections']), sections)
                self.assertTrue(all(len(section['summary'].split()) >= 70 and '\n\n' in section['summary']
                                    for section in book['guide']['sections']))
                self.assertTrue(listed[book_id]['has_guide'])
        self.assertFalse(self.client.get('/api/books/1').json['summary_reviewed'])
        self.assertFalse(listed[1]['has_guide'])
        self.assertGreater(len(self.client.get('/api/books/1').json['guide']['sections']), 0)
        self.assertFalse(self.client.get('/api/books/1').json['guide']['reviewed'])
        for book_id in (8, 42, 65, 84, 91):
            with self.subTest(overview_id=book_id):
                book = self.client.get(f'/api/books/{book_id}').json
                self.assertEqual(book['guide']['kind'], 'overview')
                self.assertGreaterEqual(len(book['guide']['sections']), 3)
                self.assertFalse(book['summary_reviewed'])

    def test_every_catalog_book_has_a_substantive_summary(self):
        catalog = self.client.get('/api/books').json
        self.assertEqual(len(catalog), 103)
        for entry in catalog:
            with self.subTest(book_id=entry['id'], title=entry['title']):
                response = self.client.get(f"/api/books/{entry['id']}")
                self.assertEqual(response.status_code, 200)
                guide = response.json['guide']
                self.assertIsNotNone(guide)
                self.assertTrue(guide['deck'].strip())
                self.assertTrue(guide['sections'])
                self.assertTrue(all(section['title'].strip() and section['summary'].strip()
                                    for section in guide['sections']))
                self.assertGreaterEqual(sum(len(section['summary'].split()) for section in guide['sections']), 200)


if __name__ == '__main__':
    unittest.main()
