/* eslint-disable no-undef */
window.addEventListener("load", () => {
    const video = window.document.getElementsByTagName("video")[0];
    if (!video) return;

    const nextVideo = (video.getAttribute("data-next-video") || "").trim();
    if (nextVideo)
        video.addEventListener("ended", () => window.location = nextVideo);

    window.matchMedia("(display-mode: fullscreen)").addEventListener("change", ({ matches }) => {
        if (!matches) return;
        const fn = video.requestFullscreen || video.webkitRequestFullscreen || video.mozRequestFullScreen;
        fn.call(video).catch(err => err);
    });
}, { passive: true });
