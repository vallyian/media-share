const files = [".", "index.html", "favicon.ico"];

const isDev =/(^http:|localhost|127\.0\.0\.1)/i.test(self.location.origin);

self.addEventListener("install", e => isDev || e.waitUntil(cacheAll()));
self.addEventListener("activate", e => isDev || e.waitUntil(clearOldCache()));
self.addEventListener("fetch", e => isDev || e.respondWith(getResource(e.request)));

async function cacheAll() {
    const cache = await getCacheName().then(key => caches.open(key));
    await cache.addAll(files);
}

async function clearOldCache() {
    const cacheKey = await getCacheName();
    const allCacheKeys = await caches.keys();
    const oldCacheKeys = allCacheKeys.filter(key => key !== cacheKey);
    if (oldCacheKeys) await Promise.all(oldCacheKeys.map(key => caches.delete(key)));
}

async function getResource(/** @type {Request} */ req) {
    try {
        let res = await caches.match(req);
        if (!res) {
            res = await fetch(req);
            if (Math.floor(res.status / 100) === 2) {
                const cache = await getCacheName().then(key => caches.open(key));
                await cache.put(req, res.clone());
            }
        }
        return res;
    } catch (ex) {
        return new Response("service-err", { status: 408 });
    }
}

async function getCacheName() {
    const buffer = await crypto.subtle.digest("SHA-256", new TextEncoder().encode(JSON.stringify(files)));
    const hexHash = Array.from(new Uint8Array(buffer))
        .map(num => num.toString(16).padStart(2, "0"))
        .join("");
    return hexHash;
}
