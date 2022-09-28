export class Config {
    readonly NODE_ENV: string;
    readonly authClient: string;
    readonly authEmails: string[];
    readonly tokenKey: string;
    readonly cookieSecret: string;
    readonly clusters: number;
    readonly port: number;
    readonly proxyLocation: string;
    readonly rateLimitMinutes: number;
    readonly rateLimitCounter: number;
    readonly mediaDir: string;

    constructor(
        environment: Record<string, string | undefined>,
        exit: (key: string) => never,
        randomStringFactory: (length: number) => string,
        clustersFactory: () => number
    ) {
        this.NODE_ENV = env("NODE_ENV").string(() => "production");
        this.authClient = env("MEDIA_SHARE__AuthClient").string();
        this.authEmails = env("MEDIA_SHARE__AuthEmails").stringArray(v => v.split(",").map(s => s.trim()).filter(s => s.includes("@")));
        this.tokenKey = env("MEDIA_SHARE__TokenKey").string(() => randomStringFactory(32));
        this.cookieSecret = env("MEDIA_SHARE__CookieSecret").string(() => randomStringFactory(32));
        this.port = env("MEDIA_SHARE__Port").number(() => 58082, n => n > 0 && n <= 65535);
        this.rateLimitMinutes = env("MEDIA_SHARE__RateLimitMinutes").number(() => 5, n => n > 0 && n <= 24 * 60);
        this.proxyLocation = env("MEDIA_SHARE__ProxyLocation").string(() => "/");

        this.clusters = this.NODE_ENV === "development" ? 1 : clustersFactory();
        this.rateLimitCounter = Math.ceil(this.rateLimitMinutes * 60 * 5 / this.clusters);
        this.mediaDir = "media";

        function env(key: string) {
            return {
                string(def?: () => string, fun?: (val: string) => boolean): string {
                    const val = environment[key] ? environment[key] : def ? def() : undefined;
                    return (typeof val === "string" && val && (!fun || fun(val))) ? val : exit(key);
                },

                number(def?: () => number, fun?: (val: number) => boolean): number {
                    const val = environment[key] ? +<string>environment[key] : def ? def() : undefined;
                    return (typeof val === "number" && isFinite(val) && (!fun || fun(val))) ? val : exit(key);
                },

                stringArray(tf: (val: string) => string[], fun?: (val: string[]) => boolean): string[] {
                    const val = environment[key] ? tf(<string>environment[key]) : undefined;
                    return (val instanceof Array && val.length && (!fun || fun(val))) ? val : exit(key);
                }
            };
        }
    }

    get clusterSharedEnv() {
        return {
            "MEDIA_SHARE__TokenKey": this.tokenKey,
            "MEDIA_SHARE__CookieSecret": this.cookieSecret
        };
    }
}
