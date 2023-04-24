import crypto from "node:crypto";
import * as gAuthLib from "google-auth-library";
import { IdTokenSPI } from "../domain/ports/SPI/IdToken.SPI";

/**
 * @param authClient Client identifier
 */
export function googleIdTokenAdapter(authClient: string): IdTokenSPI {
    const fnStr = signIn.toString();
    const fnName = signIn.name;
    return {
        getIdTokenPayload,
        csp: getCSP(fnStr),
        html: getHTML(fnStr, fnName, authClient)
    };
}

async function getIdTokenPayload(idToken: string, clientId: string) {
    const gClient = new gAuthLib.OAuth2Client(clientId);
    const loginTicket = await gClient.verifyIdToken({
        idToken,
        audience: clientId,
    });
    return loginTicket.getPayload();
}

function getCSP(fnStr: string) {
    const sha = crypto.createHash("sha256").update(fnStr).digest("base64");
    return {
        scriptSrcElem: ["https://accounts.google.com/gsi/client", `'sha256-${sha}'`],
        connectSrc: ["https://accounts.google.com/"],
        frameSrc: ["https://accounts.google.com/"]
    };
}

function getHTML(fnStr: string, fnName: string, authClient: string) {
    return `
        <script>${fnStr}</script>
        <div class="btn g_id_signin" data-type="standard"></div>
        <div id="g_id_onload" data-client_id="${authClient}" data-callback="${fnName}"></div>
        <script src="https://accounts.google.com/gsi/client"></script>
    `;
}

function signIn(response?: { credential: string | null }) {
    if (response && response.credential)
        window.location.href = window.location.href +
            (window.location.href.includes("?") ? "&" : "?") +
            `id_token=${response.credential}`;
    else
        window.location.reload();
}
