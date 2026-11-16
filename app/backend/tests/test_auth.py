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
        self.assertEqual(self.client.get('/api/progress').json[0]['percent'], 37.5)
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

    def test_source_guides_and_archive_labels(self):
        expected = {10: (11, 12), 23: (46, 5), 16: (64317, 9), 29: (43, 10), 28: (844, 3), 24: (2542, 3)}
        listed = {book['id']: book for book in self.client.get('/api/books').json}
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


if __name__ == '__main__':
    unittest.main()
