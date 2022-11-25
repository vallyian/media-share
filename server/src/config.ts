export class Config {
    readonly NODE_ENV: string;
    readonly authClient: string;
    readonly authEmails: string[];
    readonly authDav: string[];
    readonly tokenKey: string;
    readonly cookieSecret: string;
    readonly clusters: number;
    readonly davport: number;
    readonly webport: number;
    readonly proxyLocation: string;
    readonly rateLimitMinutes: number;
    readonly rateLimitCounter: number;
    readonly mediaDir: string;
    readonly certCrt: string | undefined;
    readonly certKey: string | undefined;

    constructor(
        environment: Record<string, string | undefined>,
        exit: (key: string) => never,
        randomStringFactory: (length: number) => string,
        clustersFactory: () => number,
        readFile: (path: string) => string | undefined
    ) {
        this.NODE_ENV = env("NODE_ENV", "production");
        this.authClient = env("MEDIA_SHARE__AuthClient");
        this.authEmails = env("MEDIA_SHARE__AuthEmails").split(",").map(s => s.trim()).filter(s => s.includes("@"));
        this.authDav = env("MEDIA_SHARE__AuthDav").split(",").map(s => s.trim()).filter(s => !!s);
        this.tokenKey = env("MEDIA_SHARE__TokenKey", randomStringFactory(32));
        this.cookieSecret = env("MEDIA_SHARE__CookieSecret", randomStringFactory(32));
        this.davport = number("MEDIA_SHARE__DavPort", 58092, n => n > 0 && n <= 65535);
        this.webport = number("MEDIA_SHARE__WebPort", 58082, n => n > 0 && n <= 65535);
        this.rateLimitMinutes = number("MEDIA_SHARE__RateLimitMinutes", 5, n => n > 0 && n <= 24 * 60);
        this.proxyLocation = env("MEDIA_SHARE__ProxyLocation", "/");
        this.mediaDir = env("MEDIA_SHARE__MediaDir", "media");

        this.certCrt = readFile("/run/secrets/cert.crt") || readFile("certs/cert.crt") || readFile(env("MEDIA_SHARE__CertCrt"));
        this.certKey = readFile("/run/secrets/cert.key") || readFile("certs/cert.key") || readFile(env("MEDIA_SHARE__CertKey"));

        this.clusters = this.NODE_ENV === "development" ? 1 : clustersFactory();
        this.rateLimitCounter = Math.ceil(this.rateLimitMinutes * 60 * 5 / this.clusters);

        function env(key: string, def = "") { return environment[key] || def; }

        function number(key: string, def: number, validate: (val: number) => boolean): number {
            const val = env(key) ? +env(key) : def;
            return typeof val === "number" && isFinite(val) && (!validate || validate(val)) ? val : exit(key);
        }
    }

    get clusterSharedEnv() {
        return {
            "MEDIA_SHARE__TokenKey": this.tokenKey,
            "MEDIA_SHARE__CookieSecret": this.cookieSecret
        };
    }
}
