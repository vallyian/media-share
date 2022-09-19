import * as gAuthLib from "google-auth-library";
import { IdTokenAdapter } from "../@types/Auth";
import env from "../env";
import cryptoService from "../services/crypto.service";

export default (): IdTokenAdapter => ({
    getIdTokenPayload,
    csp: csp(),
    html: html()
});

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
        scriptSrcElem: ["https://accounts.google.com/gsi/client", `'sha256-${cryptoService.sha256(signInCb.toString())}'`],
        connectSrc: ["https://accounts.google.com/"],
        frameSrc: ["https://accounts.google.com/"]
    };
}

function html(): string {
    return `
        <script>${signInCb.toString()}</script>
        <div class="btn g_id_signin" data-type="standard"></div>
        <div id="g_id_onload" data-client_id="${env.AUTH_CLIENT}" data-callback="${signInCb.name}"></div>
        <script src="https://accounts.google.com/gsi/client"></script>
    `;
}

function signInCb(response?: { credential: string | null }) {
    response && response.credential
        ? window.location.href = window.location.href + (window.location.href.includes("?") ? "&" : "?") + `id_token=${response.credential}`
        : window.location.reload();
}
