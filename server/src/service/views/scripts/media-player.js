/* eslint-disable no-undef */
window.addEventListener("load", () => {
    const video = window.document.getElementsByTagName("video")[0];
    if (!video) {
        // eslint-disable-next-line no-restricted-globals
        console.error("no video element found");
        return;
    }

    const currentTime = {
        key: decodeURIComponent(location.pathname).replace(/\/+/g, "/"),
        interval: undefined,
        get value() {
            return JSON.parse(localStorage.getItem("currentTime") || "{}");
        },
        init(cb) {
            const requested = +(q => q ? q[1] : -1)(location.search.replace(/^\?/, "").split("&").map(q => q.split("=")).find(([q]) => q === "t"));
            if (requested !== 0) {
                const saved = currentTime.value[currentTime.key];
                if (requested > 0) video.currentTime = requested;
                else if (saved > 0) video.currentTime = saved;
            }
            cb();
        },
        startInterval() {
            currentTime.clearInterval();
            currentTime.interval = setInterval(() => currentTime.save(), 5000);
        },
        clearInterval() {
            currentTime.save();
            clearInterval(currentTime.interval);
        },
        save(remove) {
            const all = currentTime.value;
            if (remove || video.currentTime === 0) {
                delete all[currentTime.key];
            } else {
                all[currentTime.key] = video.currentTime;

                // try {
                //     const req = new XMLHttpRequest();
                //     req.open("POST", "/api/media-sync");
                //     req.send();
                // } catch (_) { /* */ }
            }
            localStorage.setItem("currentTime", JSON.stringify(all));
        }
    };

    currentTime.init(() => {
        video.addEventListener("click", () => video.paused ? video.play() : video.pause());
        video.addEventListener("seeked", () => currentTime.save());
        video.addEventListener("play", () => currentTime.startInterval());
        video.addEventListener("pause", () => currentTime.clearInterval());
        video.addEventListener("ended", () => {
            currentTime.save(true);
            const nextMedia = document.getElementById("next-media");
            if (nextMedia)
                nextMedia.click();
        });
    });

}, { passive: true });
