const fs = require("node:fs");
const http = require("node:http");
const https = require("node:https");

process.env.NODE_TLS_REJECT_UNAUTHORIZED = 0;

if (require.main !== module) module.exports = checkUrl;
else checkUrl(process.argv[2], process.argv[3], process.argv[4], process.argv[5], process.argv[6]);

async function checkUrl(
    /** @type {string} */ uri,
    /** @type {number} */ expectedStatus,
    /** @type {string} */ expectedBody,
    /** @type {number} */ tries,
    /** @type {number} */ interval
) {
    uri = fixUri(uri);
    expectedStatus = +expectedStatus || 200;
    expectedBody = expectedBody ?? "";
    tries = +tries || 1;
    interval = +interval || 1;

    const url = new URL(uri);

    const isSuccess = ({ status, body }) => status === expectedStatus && body?.includes(expectedBody);

    let req;
    for (let attempt = 1; attempt <= tries; attempt++) {
        console.log(`waiting for \x1b[33m${uri}\x1b[0m (attempt ${attempt}/${tries})`);

        req = await httpGet(url);

        if (!isSuccess(req)) {
            const swappedUrl = swapHostname(url.href);
            if (swappedUrl.href !== url.href)
                req = await httpGet(swappedUrl);
        }

        if (isSuccess(req)) return;

        await new Promise(ok => setTimeout(ok, interval * 1000));
    }

    if (require.main !== module) {
        return Promise.reject(req);
    } else {
        console.error(req);
        process.exit(1);
    }
}

function fixUri(/** @type {string} */ uri) {
    if (!uri)
        return "";

    if (/https?:\/\//i.test(uri))
        return uri;

    if (process.env.MEDIA_SHARE__CertKey || fs.existsSync("/run/secrets/cert.key") || fs.existsSync("certs/cert.key"))
        return `https://${uri}`;

    return `http://${uri}`;
}

function httpGet(/** @type {URL} */ url) {
    return new Promise(done => (url.protocol === "https:" ? https : http).get(url.href, res => {
        let body = "";
        res.setEncoding("utf-8");
        res.on("data", chunk => body += chunk);
        res.on("error", err => done({ status: res.statusCode ?? -1, body, err }));
        res.on("end", () => done({ status: res.statusCode ?? -1, body }));
    }).on("error", err => done({ err })))
}

function swapHostname(/** @type {URL} */ uri) {
    const url = new URL(uri);
    switch (true) {
        case /^localhost$/i.test(url.hostname): url.hostname = "127.0.0.1"; break;
        case url.hostname === "127.0.0.1": url.hostname = "localhost"; break;
        default: break;
    }
    return url;
}
