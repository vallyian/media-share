/* eslint-disable no-undef */
window.addEventListener("load", () => {
    updateMediaSizeClass();
    window.addEventListener("resize", () => updateMediaSizeClass());

    window.matchMedia("(display-mode: fullscreen)").addEventListener("change", ({ matches }) => {
        matches
            ? document.body.classList.add("fullscreen")
            : document.body.classList.remove("fullscreen");
    });

    function updateMediaSizeClass() {
        const mediaWidthClassPrefix = "media-w-";
        const newMediaWidthClass = `${mediaWidthClassPrefix}${getMediaSize(window.innerWidth)}`;
        if (document.body.classList.contains(newMediaWidthClass)) return;
        document.body.classList.forEach(value => value.startsWith(mediaWidthClassPrefix) && document.body.classList.remove(value));
        document.body.classList.add(newMediaWidthClass);
    }

    function getMediaSize(size) {
        // default bootstrap 5 breakpoints https://getbootstrap.com/docs/5.0/layout/breakpoints/
        switch (true) {
            case size >= 1400: return "xxl"; // XX-Large devices (larger desktops,  1400px and up  )
            case size >= 1200: return "xl"; //  X-Large  devices (large desktops,   1200px and up  )
            case size >= 992: return "lg"; //   Large    devices (desktops,         992px and up   )
            case size >= 768: return "md"; //   Medium   devices (tablets,          768px and up   )
            case size >= 576: return "sm"; //   Small    devices (landscape phones, 576px and up   )
            default: return "xs"; //            X-Small  devices (portrait phones,  less than 576px)
        }
    }
}, { passive: true });
