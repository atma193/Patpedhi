const CACHE = "kg-chatboat-v54";
const SHELL = [
  "./index.html",
  "./manifest.json",
  "./icon-192.png",
  "./icon-512.png",
  "./icon-512-maskable.png"
];

self.addEventListener("install", (event) => {
  event.waitUntil(
    caches.open(CACHE).then((cache) => cache.addAll(SHELL)).then(() => self.skipWaiting())
  );
});

self.addEventListener("activate", (event) => {
  event.waitUntil(
    caches.keys().then((keys) =>
      Promise.all(keys.filter((k) => k !== CACHE).map((k) => caches.delete(k)))
    ).then(() => self.clients.claim())
  );
});

// App shell: network-first (so updates arrive), falling back to cache when offline.
// Supabase / other-origin requests are never touched.
self.addEventListener("fetch", (event) => {
  const url = new URL(event.request.url);
  if (event.request.method !== "GET" || url.origin !== location.origin) return;
  event.respondWith(
    fetch(event.request).then((res) => {
      const copy = res.clone();
      caches.open(CACHE).then((c) => c.put(event.request, copy)).catch(() => {});
      return res;
    }).catch(() => caches.match(event.request, { ignoreSearch: true }))
  );
});

// ---------- Push notifications (sent by the "send-push" Supabase Edge Function) ----------
self.addEventListener("push", (event) => {
  let d = {};
  try { d = event.data ? event.data.json() : {}; } catch (e) { d = { title: "KG Chatboat", body: event.data && event.data.text() }; }
  event.waitUntil((async () => {
    // if the app is open and visible, it shows its own in-app alert — skip the system one
    const wins = await clients.matchAll({ type: "window", includeUncontrolled: true });
    if (wins.some((w) => w.visibilityState === "visible" && w.focused)) return;
    await self.registration.showNotification(d.title || "KG Chatboat", {
      body: d.body || "New message",
      icon: "./icon-192.png",
      badge: "./icon-192.png",
      tag: "kg-" + (d.chat || "team"),
      renotify: true,
      data: { chat: d.chat || "team" }
    });
  })());
});

self.addEventListener("notificationclick", (event) => {
  event.notification.close();
  const chat = (event.notification.data && event.notification.data.chat) || "team";
  event.waitUntil((async () => {
    const wins = await clients.matchAll({ type: "window", includeUncontrolled: true });
    for (const w of wins) {
      {
        await w.focus();
        w.postMessage({ type: "open-chat", chat });
        return;
      }
    }
    await clients.openWindow("./index.html?chat=" + encodeURIComponent(chat));
  })());
});
