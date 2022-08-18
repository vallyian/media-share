import * as gAuthLib from "google-auth-library";

import { IdTokenAdapter } from "../@types/Auth";
import { env } from "../env";
import { sha256 } from "../services/crypto.service";

export const googleIdTokenAdapter: IdTokenAdapter = { getIdTokenPayload, csp: csp(), html: html() };

async function getIdTokenPayload(idToken: string, clientId: string) {
    const gClient = new gAuthLib.OAuth2Client(clientId);
    const loginTicket = await gClient.verifyIdToken({
        idToken,
        audience: clientId,
    });
    const payload = loginTicket.getPayload();
    return payload;
}

function csp(): IdTokenAdapter["csp"] {
    return {
        scriptSrcElem: ["https://accounts.google.com/gsi/client", `'sha256-${sha256(inlineScript())}'`],
        connectSrc: ["https://accounts.google.com/"],
        frameSrc: ["https://accounts.google.com/"]
    };
}

function inlineScript() {
    return `
        window.gSignInCb = response => window.location = "/?id_token=" + response.credential + "&redirect=" + encodeURIComponent(window.location.pathname);
    `;
}

function html(): string {
    return `
        <script>${inlineScript()}</script>
        <div class="g_id_signin" data-type="standard"></div>
        <div id="g_id_onload" data-client_id="${env.AUTH_CLIENT}" data-callback="gSignInCb"></div>
        <script src="https://accounts.google.com/gsi/client"></script>
    `;
}
