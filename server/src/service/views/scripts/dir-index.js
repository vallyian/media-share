/* eslint-disable no-undef */
window.addEventListener("load", () => {
    document.querySelectorAll("[data-dir-index-size]").forEach(e => e.innerText = size(+e.getAttribute("data-dir-index-size")));
    document.querySelectorAll("[data-dir-index-time]").forEach(e => e.innerText = time(+e.getAttribute("data-dir-index-time")));

    function size(value) {
        switch (true) {
            case !isFinite(value) || !value: return "";
            case value < 1000: return `${value} bytes`;
            case value < 1000000: return `${Math.round(value / 100) / 10} kb`;
            case value < 1000000000: return `${Math.round(value / 100000) / 10} mb`;
            case value < 1000000000000: return `${Math.round(value / 100000000) / 10} gb`;
            case value < 1000000000000000: return `${Math.round(value / 100000000) / 10} tb`;

            default: return String(value);
        }
    }

    function time(value) {
        const date = (() => { try { return new Date(value); } catch (_) { return undefined; } })();
        return date
            ? date.toISOString().replace("T", " - ").split(".")[0] || ""
            : "";
    }
});
