/* eslint-disable no-undef */
window.addEventListener("load", () => {
    const video = window.document.getElementsByTagName("video")[0];
    if (!video) return;

    const nextMedia = document.getElementById("next-media");
    if (nextMedia)
        video.addEventListener("ended", () => nextMedia.click());

    window.matchMedia("(display-mode: fullscreen)").addEventListener("change", ({ matches }) => {
        if (!matches) return;
        const fn = video.requestFullscreen || video.webkitRequestFullscreen || video.mozRequestFullScreen;
        fn.call(video).catch(err => err);
    });
}, { passive: true });
