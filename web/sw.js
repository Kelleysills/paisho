// Pai Sho service worker: works offline; network first so updates land right away.
const CACHE = "paisho-v4";
const SHELL = ["./", "./index.html", "./manifest.webmanifest", "./icon-192.png", "./icon-512.png"];
self.addEventListener("install", (e) => { e.waitUntil(caches.open(CACHE).then((c) => c.addAll(SHELL))); self.skipWaiting(); });
self.addEventListener("activate", (e) => {
  e.waitUntil(caches.keys().then((ks) => Promise.all(ks.filter((k) => k !== CACHE).map((k) => caches.delete(k)))).then(() => self.clients.claim()));
});
self.addEventListener("fetch", (e) => {
  const url = new URL(e.request.url);
  if (e.request.method !== "GET" || url.origin !== location.origin) return;
  const fresh = url.href + (url.search ? "&" : "?") + "_=" + Date.now();
  e.respondWith(fetch(fresh, { cache: "no-store" }).then((r) => { const copy = r.clone(); caches.open(CACHE).then((c) => c.put(e.request, copy)); return r; })
    .catch(() => caches.match(e.request).then((r) => r || caches.match("./index.html"))));
});
self.addEventListener("push", (e) => {
  let d = {}; try { d = e.data ? e.data.json() : {}; } catch (err) { d = { body: e.data && e.data.text() }; }
  e.waitUntil(self.clients.matchAll({ type: "window", includeUncontrolled: true }).then((cs) => {
    const test = String(d.tag || "").startsWith("test");
    if (!test && cs.some((c) => c.visibilityState === "visible" && c.focused)) return; // app is open and showing: it alerts in-app
    return self.registration.showNotification(d.title || "Pai Sho", { body: d.body || "", tag: d.tag || undefined, renotify: !!d.tag, icon: "icon-192.png", badge: "icon-192.png", data: { url: d.url || "./" } });
  }));
});
self.addEventListener("notificationclick", (e) => {
  e.notification.close();
  e.waitUntil(self.clients.matchAll({ type: "window", includeUncontrolled: true }).then((cs) => {
    for (const c of cs) if ("focus" in c) return c.focus();
    return self.clients.openWindow("./");
  }));
});
