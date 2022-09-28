import { ContentSecurityPolicy } from "../../objects/ContentSecurityPolicy";

export interface IdTokenAPI {
    /**
     * Get external provider html for render its signin details
     * @param provider
     */
    html(provider: string): Promise<string>;

    /**
     * Get CSP exceptions from all configured external providers to allow requests in browser
     */
    csp(): ContentSecurityPolicy;
}
