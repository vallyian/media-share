export const omitted = "*omitted*";

export function omitToken(url: string) {

    if (url.indexOf("id_token=") < 0)
        return url;

    const urlObj = new URL(url);
    if (!urlObj.searchParams.get("id_token"))
        return url;

    urlObj.searchParams.set("id_token", omitted);
    return urlObj.toString();
}
