/* eslint-disable no-undef */
window.addEventListener("load", () => {
    const video = window.document.getElementsByTagName("video")[0];
    if (!video) return;

    const nextVideo = (video.getAttribute("data-next-video") || "").trim();
    if (!nextVideo) return;

    video.onended = () => window.location = nextVideo;
}, { passive: true });
