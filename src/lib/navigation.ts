export function navigateTo(page: string) {
  const normalized = page.startsWith('/') ? page : `/${page}`;
  window.history.pushState(null, '', normalized);
  window.dispatchEvent(new PopStateEvent('popstate'));
}
