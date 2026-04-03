const DEFAULT_SITE_NAME = 'Swarnandrian';
const DEFAULT_IMAGE_PATH = '/logo.png';
const DEFAULT_IMAGE_ALT = 'Swarnandrian logo';

function resolveUrl(value) {
  if (typeof window === 'undefined' || !value) {
    return value || '';
  }

  try {
    return new URL(value, window.location.origin).toString();
  } catch {
    return value;
  }
}

function upsertMeta(attributeName, attributeValue, content) {
  if (typeof document === 'undefined') {
    return;
  }

  const selector = `meta[${attributeName}="${attributeValue}"]`;
  let element = document.head.querySelector(selector);

  if (!element) {
    element = document.createElement('meta');
    element.setAttribute(attributeName, attributeValue);
    document.head.appendChild(element);
  }

  element.setAttribute('content', content);
}

function upsertLink(rel, href) {
  if (typeof document === 'undefined') {
    return;
  }

  const selector = `link[rel="${rel}"]`;
  let element = document.head.querySelector(selector);

  if (!element) {
    element = document.createElement('link');
    element.setAttribute('rel', rel);
    document.head.appendChild(element);
  }

  element.setAttribute('href', href);
}

function upsertJsonLd(id, jsonLd) {
  if (typeof document === 'undefined') {
    return;
  }

  const selector = `script[data-seo-id="${id}"]`;
  const existing = document.head.querySelector(selector);

  if (!jsonLd) {
    if (existing) {
      existing.remove();
    }
    return;
  }

  let element = existing;

  if (!element) {
    element = document.createElement('script');
    element.type = 'application/ld+json';
    element.setAttribute('data-seo-id', id);
    document.head.appendChild(element);
  }

  element.textContent = JSON.stringify(jsonLd);
}

export function applyPageMetadata({
  title,
  description,
  keywords,
  robots = 'index,follow',
  canonical,
  url,
  image = DEFAULT_IMAGE_PATH,
  imageAlt = DEFAULT_IMAGE_ALT,
  type = 'website',
  siteName = DEFAULT_SITE_NAME,
  locale = 'en_IN',
  jsonLd = null,
}) {
  if (typeof document === 'undefined') {
    return;
  }

  const resolvedUrl = resolveUrl(url || canonical || window.location.href);
  const resolvedCanonical = resolveUrl(canonical || url || window.location.href);
  const resolvedImage = resolveUrl(image);

  if (title) {
    document.title = title;
  }

  if (description) {
    upsertMeta('name', 'description', description);
  }

  if (keywords) {
    const keywordValue = Array.isArray(keywords) ? keywords.join(', ') : keywords;
    upsertMeta('name', 'keywords', keywordValue);
  }

  upsertMeta('name', 'robots', robots);
  upsertMeta('property', 'og:title', title || siteName);
  upsertMeta('property', 'og:description', description || '');
  upsertMeta('property', 'og:type', type);
  upsertMeta('property', 'og:url', resolvedUrl);
  upsertMeta('property', 'og:image', resolvedImage);
  upsertMeta('property', 'og:image:alt', imageAlt);
  upsertMeta('property', 'og:site_name', siteName);
  upsertMeta('property', 'og:locale', locale);
  upsertMeta('name', 'twitter:card', 'summary_large_image');
  upsertMeta('name', 'twitter:title', title || siteName);
  upsertMeta('name', 'twitter:description', description || '');
  upsertMeta('name', 'twitter:image', resolvedImage);
  upsertMeta('name', 'twitter:image:alt', imageAlt);
  upsertMeta('name', 'application-name', siteName);
  upsertMeta('name', 'apple-mobile-web-app-title', siteName);
  upsertLink('canonical', resolvedCanonical);
  upsertJsonLd('page-json-ld', jsonLd);
}