// TODO: use a viewengine

export const favicon =
    "<svg xmlns=\"http://www.w3.org/2000/svg\" fill=\"#0080FF\" width=\"16\" height=\"16\" viewBox=\"0 0 16 16\">" +
    "<path d=\"M11 2.5a2.5 2.5 0 1 1 .603 1.628l-6.718 3.12a2.499 2.499 0 0 1 0 1.504l6.718 3.12a2.5 2.5 0 1 1-.488.876l-6.718-3.12a2.5 2.5 0 1 1 0-3.256l6.718-3.12A2.5 2.5 0 0 1 11 2.5z\"/>" +
    "</svg>";

export function html(items: Error | ItemStat[]): Error | string {
    return items instanceof Error
        ? items
        : table(items.map(item => tr(`${td(a(item.name, `${link(item.parent, item.name)}`))}${td(item.size)}`)).join(""));
}

function table(value: string) { return `<table>${value}</table>`; }
function tr(value: string) { return `<tr>${value}</tr>`; }
function td(value: string | number) { return `<td>${value}</td>`; }
function a(value: string | number, href: string) { return `<a href="${href}">${value}</a>`; }

export function videoPlayer(relativePath: string, fileExtension: string, mimeType: string): string {
    return `
        <video controls autoplay preload="metadata">
            <source type="${mimeType}"
                src="${relativePath}?static=true">
            <track kind="subtitles" default label="English" srclang="en"
                src="${relativePath.replace(new RegExp(`\\${fileExtension}$`, "i"), ".vtt")}?video=${fileExtension}">
        </video>
    `;
}

function link(parent, name) {
    return parent === ""
        ? encodeURIComponent(name)
        : parent.split(/[\\/]/g).concat(name).map(p => encodeURIComponent(p)).join("/");
}
