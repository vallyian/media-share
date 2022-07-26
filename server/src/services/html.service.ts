// TODO: use a viewengine

export function html(items: Error | ItemStat[]): Error | string {
    return items instanceof Error
        ? items
        : table(items.map(item => tr(td(a(item.name, item.name)) + td(item.size))).join());
}

function table(value: string) { return `<table>${value}</table>`; }
function tr(value: string) { return `<tr>${value}</tr>`; }
function td(value: string | number) { return `<td>${value}</td>`; }
function a(value: string | number, link: string) { return `<a href="${link}">${value}</a>`; }
