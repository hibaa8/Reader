import { useLibrary } from '../LibraryContext';

export function useReadingHistory() {
    const { progress, saveProgress } = useLibrary();
    const readIds = Object.values(progress).filter((entry) => entry.completed).map((entry) => Number(entry.bookId));
    const toggleRead = (id) => {
        const entry = progress[id];
        return saveProgress(id, entry?.completed ? 0 : 100, !entry?.completed);
    };
    return { readIds, toggleRead };
}
