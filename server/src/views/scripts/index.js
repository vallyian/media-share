/* eslint-disable no-undef */
window.addEventListener("load", () => {
    window.matchMedia("(display-mode: fullscreen)").addEventListener("change", ({ matches }) => {
        matches
            ? document.body.classList.add("fullscreen")
            : document.body.classList.remove("fullscreen");
    });
}, { passive: true });
