const genres = [
    ['Science fiction', /science fiction|time travel|dystopi/i],
    ['Fantasy', /fantasy|fairy tales|magic|folklore/i],
    ['Mystery', /detective|mystery|crime|sleuth/i],
    ['Horror', /ghost|horror|gothic|supernatural/i],
    ['Romance', /romance|love stories|courtship/i],
    ['Adventure', /adventure|sea stories|voyages|exploration|shipwreck/i],
    ['History', /history|historical|biograph|memoir/i],
    ['Ideas', /philosophy|psychology|political|ethics|religion|science|mathematics/i],
    ['Poetry', /poetry|poems/i],
    ['Drama', /drama|plays|tragedies|comedies/i],
];

export function coverGenre(book) {
    const subject = book.subject || '';
    return genres.find(([, pattern]) => pattern.test(subject))?.[0] || 'Literature';
}
