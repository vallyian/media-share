import * as gAuthLib from "google-auth-library";

let _sha256: (input: string) => string;
let _authClient: string;

/**
 * Init adapter
 * @param sha256 Function to calc SHA256 hash
 * @param authClient Client identifier
 */
export default function init(sha256: (input: string) => string, authClient: string) {
    _sha256 = sha256 || (() => { throw Error("sha256 function not provided"); })();
    _authClient = authClient || (() => { throw Error("authClient string not provided"); })();

    return {
        getIdTokenPayload,
        csp: csp(),
        html: html()
    };
}

async function getIdTokenPayload(idToken: string, clientId: string) {
    const gClient = new gAuthLib.OAuth2Client(clientId);
    const loginTicket = await gClient.verifyIdToken({
        idToken,
        audience: clientId,
    });
    const payload = loginTicket.getPayload();
    return payload;
}

function csp() {
    return {
        scriptSrcElem: ["https://accounts.google.com/gsi/client", `'sha256-${_sha256(signInCb.toString())}'`],
        connectSrc: ["https://accounts.google.com/"],
        frameSrc: ["https://accounts.google.com/"]
    };
}

function html() {
    return `
        <script>${signInCb.toString()}</script>
        <div class="btn g_id_signin" data-type="standard"></div>
        <div id="g_id_onload" data-client_id="${_authClient}" data-callback="${signInCb.name}"></div>
        <script src="https://accounts.google.com/gsi/client"></script>
    `;
}

function signInCb(response?: { credential: string | null }) {
    response && response.credential
        ? window.location.href = window.location.href + (window.location.href.includes("?") ? "&" : "?") + `id_token=${response.credential}`
        : window.location.reload();
}
