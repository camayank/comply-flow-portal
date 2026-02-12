export function getCookieValue(name: string): string | null {
  const escaped = name.replace(/[$()*+./?[\\\]^{|}-]/g, '\\$&');
  const match = document.cookie.match(new RegExp(`(?:^|; )${escaped}=([^;]*)`));
  return match ? decodeURIComponent(match[1]) : null;
}

export function getCsrfToken(): string | null {
  return getCookieValue('csrfToken');
}

export function withCsrfHeaders(headers?: HeadersInit): Headers {
  const result = new Headers(headers || {});
  const token = getCsrfToken();
  if (token) {
    result.set('X-CSRF-Token', token);
  }
  result.set('X-Requested-With', 'XMLHttpRequest');
  return result;
}

declare global {
  interface Window {
    __csrfFetchPatched?: boolean;
  }
}

export function setupFetchCsrf(): void {
  if (typeof window === 'undefined' || window.__csrfFetchPatched) {
    return;
  }

  const originalFetch = window.fetch.bind(window);

  window.fetch = (input: RequestInfo | URL, init?: RequestInit) => {
    const request = input instanceof Request ? input : new Request(input, init);
    const method = (request.method || 'GET').toUpperCase();
    const url = request.url;
    const sameOrigin = url.startsWith('/') || url.startsWith(window.location.origin);

    if (!['GET', 'HEAD', 'OPTIONS'].includes(method) && sameOrigin) {
      const headers = withCsrfHeaders(request.headers);
      const nextRequest = new Request(request, { headers });
      return originalFetch(nextRequest);
    }

    return originalFetch(request);
  };

  window.__csrfFetchPatched = true;
}
