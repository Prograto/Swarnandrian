const STORAGE_KEY = 'swarnandrian-bookmarks';

export function readBookmarks() {
  try {
    return JSON.parse(localStorage.getItem(STORAGE_KEY) || '[]');
  } catch {
    return [];
  }
}

export function writeBookmarks(items) {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(items));
}

export function upsertBookmark(item) {
  const current = readBookmarks();
  const existingIndex = current.findIndex((row) => row.id === item.id);
  if (existingIndex >= 0) {
    const next = [...current];
    next[existingIndex] = { ...next[existingIndex], ...item };
    writeBookmarks(next);
    return { active: true, items: next };
  }

  const next = [{ ...item, bookmarked_at: new Date().toISOString() }, ...current];
  writeBookmarks(next);
  return { active: true, items: next };
}

export function removeBookmarkById(id) {
  const next = readBookmarks().filter((row) => row.id !== id);
  writeBookmarks(next);
  return { active: false, items: next };
}

export function toggleBookmark(item) {
  const current = readBookmarks();
  const exists = current.some((row) => row.id === item.id);
  if (exists) {
    return removeBookmarkById(item.id);
  }
  return upsertBookmark(item);
}

export function isBookmarked(id) {
  return readBookmarks().some((row) => row.id === id);
}
