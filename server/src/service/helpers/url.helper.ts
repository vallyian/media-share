export const omitted = "*omitted*";

export function omitToken(uri: string) {
    if (uri.indexOf("id_token=") < 0)
        return uri;

    const url = new URL((/^[a-z]:\/\//i.test(uri) ? "" : "protocol://") + uri);
    if (!url.searchParams.get("id_token"))
        return uri;

    url.searchParams.set("id_token", omitted);
    return url.href.replace("protocol://", "");
}
