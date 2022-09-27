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

    readonly mediaDir = "media";
    readonly supportedVideos = ["mp4"];
    readonly supportedSubtitles = ["srt", "sub"];

    constructor(
        env: Record<string, string | undefined>,
        exit: (key: string) => never,
        clustersFactory: () => number
    ) {
        this.authClient = string("MEDIA_SHARE__AuthClient");
        this.authEmails = stringArray("MEDIA_SHARE__AuthEmails", v => v.split(",").map(s => s.trim()).filter(s => s.includes("@")));
        this.tokenKey = string("MEDIA_SHARE__TokenKey");
        this.cookieSecret = string("MEDIA_SHARE__CookieSecret");
        this.port = number("MEDIA_SHARE__Port", 58082, n => n > 0 && n < 65536);
        this.rateLimitMinutes = number("MEDIA_SHARE__RateLimitMinutes", 5, n => n > 0 && n < 24 * 60);
        this.proxyLocation = string("MEDIA_SHARE__ProxyLocation", "/");
        this.NODE_ENV = string("NODE_ENV", "production");
        this.clusters = this.NODE_ENV === "development" ? 1 : clustersFactory();
        this.rateLimitCounter = Math.ceil(this.rateLimitMinutes * 60 * 5 / this.clusters);

        function string(key: string, def?: string, fun?: (val: string) => boolean): string {
            const val = env[key] !== undefined ? env[key] : def;
            return (typeof val === "string" && (!fun || fun(val))) ? val : exit(key);
        }

        function number(key: string, def?: number, fun?: (val: number) => boolean): number {
            const val = env[key] !== undefined ? env[key] : def;
            return (typeof val === "number" && (!fun || fun(val))) ? val : exit(key);
        }

        function stringArray(key: string, tf: (val: string) => string[], fun?: (val: string[]) => boolean): string[] {
            const val = env[key] !== undefined ? tf(<string>env[key]) : undefined;
            return (val instanceof Array && (!fun || fun(val))) ? val : exit("");
        }
    }
}
