import test from 'node:test';
import assert from 'node:assert/strict';
import { recommendBooks } from './recommendations.mjs';

const books = [
    { id: 1, title: 'Read book', author: 'A Writer', subject: 'Gothic fiction, Horror tales' },
    { id: 2, title: 'Same author', author: 'A Writer', subject: 'Travel' },
    { id: 3, title: 'Same subject', author: 'Other', subject: 'Horror tales' },
    { id: 4, title: 'Different book', author: 'Other', subject: 'Mathematics' },
];

test('recommendations use reading history and exclude books in progress', () => {
    assert.deepEqual(recommendBooks(books, {}), []);
    const result = recommendBooks(books, {
        1: { bookId: 1, percent: 100, completed: true },
        4: { bookId: 4, percent: 30, completed: false },
    });
    assert.deepEqual(result.map(({ book }) => book.id), [3, 2]);
    assert.equal(result[0].reason, 'Shares subjects you read');
});

test('a short accidental open does not drive recommendations', () => {
    assert.deepEqual(recommendBooks(books, { 1: { bookId: 1, percent: 5, completed: false } }), []);
});
