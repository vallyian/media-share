/* eslint-disable no-undef */
window.addEventListener("load", () => {
    const video = window.document.getElementsByTagName("video")[0];
    if (!video) return;

    const ctKey = decodeURIComponent(location.pathname).replace(/\/+/g, "/");

    const nextMedia = document.getElementById("next-media");
    if (nextMedia)
        video.addEventListener("ended", () => nextMedia.click());

    setCt();

    let ctInterval;
    video.addEventListener("play", () => ctInterval = setInterval(() => saveCt(), 5000));
    video.addEventListener("pause", () => clearInterval(ctInterval));
    video.addEventListener("ended", () => saveCt(true));

    function getCt() { return JSON.parse(localStorage.getItem("currentTime") || "{}"); }

    function setCt() {
        let ctThis = getCt()[ctKey];
        if (ctThis > 0) video.currentTime = ctThis;
    }

    function saveCt(remove) {
        const all = getCt();
        remove || video.currentTime === 0
            ? delete all[ctKey]
            : all[ctKey] = video.currentTime;
        localStorage.setItem("currentTime", JSON.stringify(all));
    }
}, { passive: true });
