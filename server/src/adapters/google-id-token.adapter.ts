import crypto from "node:crypto";
import * as gAuthLib from "google-auth-library";
import { IdTokenSPI } from "../domain/ports/SPI/IdToken.SPI";

export class GoogleIdTokenAdapter implements IdTokenSPI {
    /**
     * @param authClient Client identifier
     */
    constructor(
        private readonly authClient: string
    ) { }

    /** @inheritdoc */
    async getIdTokenPayload(idToken: string, clientId: string) {
        const gClient = new gAuthLib.OAuth2Client(clientId);
        const loginTicket = await gClient.verifyIdToken({
            idToken,
            audience: clientId,
        });
        const payload = loginTicket.getPayload();
        return payload;
    }

    /** @inheritdoc */
    get csp() {
        const sha = crypto.createHash("sha256").update(this.signInCb().toString()).digest("base64");
        return {
            scriptSrcElem: ["https://accounts.google.com/gsi/client", `'sha256-${sha}'`],
            connectSrc: ["https://accounts.google.com/"],
            frameSrc: ["https://accounts.google.com/"]
        };
    }

    /** @inheritdoc */
    get html() {
        return `
            <script>${this.signInCb().toString()}</script>
            <div class="btn g_id_signin" data-type="standard"></div>
            <div id="g_id_onload" data-client_id="${this.authClient}" data-callback="${this.signInCb().name}"></div>
            <script src="https://accounts.google.com/gsi/client"></script>
        `;
    }

    private signInCb() {
        return function signInCb(response?: { credential: string | null }) {
            if (response && response.credential)
                window.location.href = window.location.href +
                    (window.location.href.includes("?") ? "&" : "?") +
                    `id_token=${response.credential}`;
            else
                window.location.reload();
        };
    }
}
