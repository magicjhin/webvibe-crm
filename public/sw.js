/* Webvibe CRM — Service Worker (Iter 6).
 *
 * Стратегия (single-user внутренняя CRM, dark-first PWA):
 *   - навигации (HTML): network-first, fallback на закешированную страницу,
 *     затем на статичную /offline-оболочку;
 *   - статика (_next/static, /icons, шрифты): cache-first (+ обновление в фоне);
 *   - всё динамическое (/api, /sign, авторизация, POST и не-GET): только сеть,
 *     SW не вмешивается и ничего не кеширует.
 *
 * Регистрируется ТОЛЬКО в production (см. components/pwa/PwaRegister.tsx).
 */

const VERSION = "wv-crm-v1";
const PRECACHE = `${VERSION}-precache`;
const RUNTIME = `${VERSION}-runtime`;

// Гарантированно нужно для offline-оболочки.
const PRECACHE_URLS = [
  "/offline",
  "/manifest.webmanifest",
  "/icons/icon-192.png",
  "/icons/icon-512.png",
  "/icons/apple-touch-icon.png",
];

self.addEventListener("install", (event) => {
  event.waitUntil(
    caches
      .open(PRECACHE)
      .then((cache) => cache.addAll(PRECACHE_URLS))
      .then(() => self.skipWaiting()),
  );
});

self.addEventListener("activate", (event) => {
  event.waitUntil(
    caches
      .keys()
      .then((keys) =>
        Promise.all(
          keys
            .filter((k) => k !== PRECACHE && k !== RUNTIME)
            .map((k) => caches.delete(k)),
        ),
      )
      .then(() => self.clients.claim()),
  );
});

// Позволяет странице форсировать обновление SW (skipWaiting).
self.addEventListener("message", (event) => {
  if (event.data === "SKIP_WAITING") self.skipWaiting();
});

function isStaticAsset(url) {
  return (
    url.pathname.startsWith("/_next/static/") ||
    url.pathname.startsWith("/icons/") ||
    url.pathname.startsWith("/fonts/") ||
    url.pathname === "/manifest.webmanifest"
  );
}

self.addEventListener("fetch", (event) => {
  const { request } = event;

  // Только GET и только тот же origin — остальное отдаём сети как есть.
  if (request.method !== "GET") return;
  const url = new URL(request.url);
  if (url.origin !== self.location.origin) return;

  // Динамика: API, публичная подпись, авторизация — всегда сеть, без кеша.
  if (
    url.pathname.startsWith("/api/") ||
    url.pathname.startsWith("/sign/") ||
    url.pathname.startsWith("/login")
  ) {
    return;
  }

  // Навигации (HTML-страницы): чистый network-first, БЕЗ кеширования HTML.
  // CRM содержит приватные данные клиента + auth-редиректы — кешировать
  // авторизованные страницы в Cache Storage небезопасно (утечка после logout,
  // риск закешировать login-HTML под protected URL). Поэтому офлайн → только
  // статичная /offline-оболочка (она в precache).
  if (request.mode === "navigate") {
    event.respondWith(
      fetch(request).catch(async () => {
        const offline = await caches.match("/offline");
        return (
          offline ||
          new Response("Offline", { status: 503, statusText: "Offline" })
        );
      }),
    );
    return;
  }

  // Статика: cache-first с фоновым обновлением (stale-while-revalidate).
  if (isStaticAsset(url)) {
    event.respondWith(
      (async () => {
        const cached = await caches.match(request);
        const network = fetch(request)
          .then((resp) => {
            if (resp && resp.status === 200) {
              caches.open(RUNTIME).then((cache) => cache.put(request, resp.clone()));
            }
            return resp;
          })
          .catch(() => cached);
        return cached || network;
      })(),
    );
  }
});
