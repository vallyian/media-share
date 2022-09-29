/* eslint-disable no-undef */
window.addEventListener("load", () => {
    const video = window.document.getElementsByTagName("video")[0];
    if (!video) {
        // eslint-disable-next-line no-restricted-globals
        console.error("no video element found");
        return;
    }

    const url = decodeURIComponent(location.pathname).replace(/\/+/g, "/");
    let interval;

    function saveTime() {
        localStorage.setItem("time", JSON.stringify({ url, time: video.currentTime || 0 }));
        // try {
        //     const req = new XMLHttpRequest();
        //     req.open("POST", "/api/media-sync");
        //     req.send();
        // } catch (_) { /* */ }
    }

    function playNext(id) {
        document.querySelector(`[data-${id}-media]`)?.click();
    }

    if (video.querySelector("source")?.getAttribute("type")?.startsWith("audio"))
        document.querySelector(".playlist")?.classList.remove("d-none");
    document.querySelector("[data-prev-btn]")?.addEventListener("click", () => playNext("prev"));
    document.querySelector("[data-next-btn]")?.addEventListener("click", () => playNext("next"));

    const t = JSON.parse(localStorage.getItem("time") || "{}");
    const time = t.url === url ? t.time : 0;
    if (isFinite(time) && time > 0) video.currentTime = time;

    video.addEventListener("click", () => video.paused ? video.play() : video.pause());
    video.addEventListener("seeked", () => saveTime());
    video.addEventListener("play", () => {
        clearInterval(interval);
        saveTime();
        interval = setInterval(() => saveTime(), 5000);
    });
    video.addEventListener("pause", () => {
        clearInterval(interval);
        saveTime();
    });
    video.addEventListener("ended", () => playNext("next"));
}, { passive: true });
