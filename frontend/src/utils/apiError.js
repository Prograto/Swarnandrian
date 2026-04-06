export function getApiErrorMessage(error, fallback = 'Something went wrong') {
  const detail = error?.response?.data?.detail;

  if (typeof detail === 'string' && detail.trim()) {
    return detail;
  }

  if (Array.isArray(detail)) {
    const messages = detail
      .map((item) => {
        if (!item) return '';
        if (typeof item === 'string') return item;
        if (typeof item === 'object') {
          const path = Array.isArray(item.loc) ? item.loc.filter(Boolean).join('.') : '';
          const message = item.msg || item.message || '';
          return path && message ? `${path}: ${message}` : message || path;
        }
        return String(item);
      })
      .filter(Boolean);

    if (messages.length > 0) {
      return messages.join('\n');
    }
  }

  if (detail && typeof detail === 'object') {
    return detail.msg || detail.message || fallback;
  }

  if (typeof error?.message === 'string' && error.message.trim()) {
    return error.message;
  }

  return fallback;
}