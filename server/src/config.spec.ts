import { Config } from "./config";

/* eslint-disable no-restricted-globals */
/* eslint-disable @typescript-eslint/no-var-requires -- project is set to module but tests are commonjs */
describe("config", () => {
    let exitSpy: jasmine.Spy<(key: string) => never>;
    let randomStringFactorySpy: jasmine.Spy<(length: number) => string>;
    let clustersFactorySpy: jasmine.Spy<() => number>;
    let readFileSpy: jasmine.Spy<(path: string) => string | undefined>;

    beforeEach(() => {
        exitSpy = jasmine.createSpy("exit");
        randomStringFactorySpy = jasmine.createSpy("randomStringFactory").and.callFake((length: number) => Buffer.from("x".repeat(length)).toString("base64"));
        clustersFactorySpy = jasmine.createSpy("clustersFactory");
        readFileSpy = jasmine.createSpy("readFile");
    });

    describe("NODE_ENV", () => {
        const envKey = "NODE_ENV";
        const defaultEnvValue = "production";

        it("not set => default", () => {
            const config = Config({}, exitSpy, randomStringFactorySpy, clustersFactorySpy, readFileSpy);
            expect(config.NODE_ENV).toEqual(defaultEnvValue);
        });

        it("value", () => {
            const testEnvValue = envKey;
            const config = Config({ [envKey]: testEnvValue }, exitSpy, randomStringFactorySpy, clustersFactorySpy, readFileSpy);
            expect(config.NODE_ENV).toEqual(testEnvValue);
        });
    });

    describe("authClient", () => {
        const envKey = "MEDIA_SHARE__AuthClient";
        const defaultEnvValue = "";

        it("not set => default", () => {
            const config = Config({}, exitSpy, randomStringFactorySpy, clustersFactorySpy, readFileSpy);
            expect(config.authClient).toEqual(defaultEnvValue);
        });

        it("valid", () => {
            const testEnvValue = envKey;
            const config = Config({ [envKey]: testEnvValue }, exitSpy, randomStringFactorySpy, clustersFactorySpy, readFileSpy);
            expect(config.authClient).toEqual(testEnvValue);
        });
    });

    describe("authEmails", () => {
        const envKey = "MEDIA_SHARE__AuthEmails";
        const defaultEnvValue = new Array<string>();

        it("not set => default", () => {
            const config = Config({}, exitSpy, randomStringFactorySpy, clustersFactorySpy, readFileSpy);
            expect(config.authEmails).toEqual(defaultEnvValue);
        });

        it("invalid => default", () => {
            const testEnvValue = `${envKey},     ,,,  ,`;
            const config = Config({ [envKey]: testEnvValue }, exitSpy, randomStringFactorySpy, clustersFactorySpy, readFileSpy);
            expect(config.authEmails).toEqual(defaultEnvValue);
        });

        it("valid", () => {
            const testEnvValue = `${envKey}@email.1,${envKey}@email.2`;
            const config = Config({ [envKey]: testEnvValue }, exitSpy, randomStringFactorySpy, clustersFactorySpy, readFileSpy);
            expect(config.authEmails).toEqual(testEnvValue.split(","));
        });

        it("valid (mixed valid and invalid values)", () => {
            const testEnvValidValues = `${envKey}@email.1,${envKey}@email.2`;
            const testEnvInvalidValues = `${envKey},     ,,,  ,`;
            const testEnvValue = `${testEnvValidValues},${testEnvInvalidValues}`;
            const config = Config({ [envKey]: testEnvValue }, exitSpy, randomStringFactorySpy, clustersFactorySpy, readFileSpy);
            expect(config.authEmails).toEqual(testEnvValidValues.split(","));
        });
    });

    describe("authDav", () => {
        const envKey = "MEDIA_SHARE__AuthDav";
        const defaultEnvValue = new Array<string>();

        it("not set => default", () => {
            const config = Config({}, exitSpy, randomStringFactorySpy, clustersFactorySpy, readFileSpy);
            expect(config.authDav).toEqual(defaultEnvValue);
        });

        it("invalid => default", () => {
            const testEnvValue = "     ,,,  ,";
            const config = Config({ [envKey]: testEnvValue }, exitSpy, randomStringFactorySpy, clustersFactorySpy, readFileSpy);
            expect(config.authDav).toEqual(defaultEnvValue);
        });

        it("valid", () => {
            const testEnvValue = `${envKey}-1,${envKey}-2`;
            const config = Config({ [envKey]: testEnvValue }, exitSpy, randomStringFactorySpy, clustersFactorySpy, readFileSpy);
            expect(config.authDav).toEqual(testEnvValue.split(","));
        });

        it("valid (mixed valid and invalid values)", () => {
            const testEnvValidValues = `${envKey}-1,${envKey}-2`;
            const testEnvInvalidValues = "     ,,,  ,";
            const testEnvValue = `${testEnvValidValues},${testEnvInvalidValues}`;
            const config = Config({ [envKey]: testEnvValue }, exitSpy, randomStringFactorySpy, clustersFactorySpy, readFileSpy);
            expect(config.authDav).toEqual(testEnvValidValues.split(","));
        });
    });

    describe("tokenKey", () => {
        const envKey = "MEDIA_SHARE__TokenKey";
        const defaultRandomStringLength = 32;

        it("not set => random auto regenerated", () => {
            const config = Config({}, exitSpy, randomStringFactorySpy, clustersFactorySpy, readFileSpy);
            expect(randomStringFactorySpy).toHaveBeenCalledWith(defaultRandomStringLength);
            expect(config.tokenKey.length).toBeGreaterThan(defaultRandomStringLength);
        });

        it("value", () => {
            const testEnvValue = envKey;
            const config = Config({ [envKey]: testEnvValue }, exitSpy, randomStringFactorySpy, clustersFactorySpy, readFileSpy);
            expect(config.tokenKey).toEqual(testEnvValue);
        });
    });

    describe("cookieSecret", () => {
        const envKey = "MEDIA_SHARE__CookieSecret";
        const defaultRandomStringLength = 32;

        it("not set => random auto regenerated", () => {
            const config = Config({}, exitSpy, randomStringFactorySpy, clustersFactorySpy, readFileSpy);
            expect(randomStringFactorySpy).toHaveBeenCalledWith(defaultRandomStringLength);
            expect(config.cookieSecret.length).toBeGreaterThan(defaultRandomStringLength);
        });

        it("value", () => {
            const testEnvValue = envKey;
            const config = Config({ [envKey]: testEnvValue }, exitSpy, randomStringFactorySpy, clustersFactorySpy, readFileSpy);
            expect(config.cookieSecret).toEqual(testEnvValue);
        });
    });

    describe("davport", () => {
        const envKey = "MEDIA_SHARE__DavPort";
        const defaultEnvValue = 58092;

        it("not set => default", () => {
            const config = Config({}, exitSpy, randomStringFactorySpy, clustersFactorySpy, readFileSpy);
            expect(exitSpy).not.toHaveBeenCalled();
            expect(config.davport).toEqual(defaultEnvValue);
        });

        it("invalid => exit", () => {
            const testEnvValue = String(1 + 65535);
            const config = Config({ [envKey]: testEnvValue }, exitSpy, randomStringFactorySpy, clustersFactorySpy, readFileSpy);
            expect(exitSpy).toHaveBeenCalledOnceWith(envKey);
            expect(config.davport).not.toBeDefined();
        });

        it("value", () => {
            const testEnvValue = String(42);
            const config = Config({ [envKey]: testEnvValue }, exitSpy, randomStringFactorySpy, clustersFactorySpy, readFileSpy);
            expect(exitSpy).not.toHaveBeenCalled();
            expect(config.davport).toEqual(+testEnvValue);
        });
    });

    describe("webport", () => {
        const envKey = "MEDIA_SHARE__WebPort";
        const defaultEnvValue = 58082;

        it("not set => default", () => {
            const config = Config({}, exitSpy, randomStringFactorySpy, clustersFactorySpy, readFileSpy);
            expect(exitSpy).not.toHaveBeenCalled();
            expect(config.webport).toEqual(defaultEnvValue);
        });

        it("invalid => exit", () => {
            const testEnvValue = String(1 + 65535);
            const config = Config({ [envKey]: testEnvValue }, exitSpy, randomStringFactorySpy, clustersFactorySpy, readFileSpy);
            expect(exitSpy).toHaveBeenCalledOnceWith(envKey);
            expect(config.webport).not.toBeDefined();
        });

        it("value", () => {
            const testEnvValue = String(42);
            const config = Config({ [envKey]: testEnvValue }, exitSpy, randomStringFactorySpy, clustersFactorySpy, readFileSpy);
            expect(exitSpy).not.toHaveBeenCalled();
            expect(config.webport).toEqual(+testEnvValue);
        });
    });

    describe("proxyLocation", () => {
        const envKey = "MEDIA_SHARE__ProxyLocation";
        const defaultEnvValue = "/";

        it("not set => default", () => {
            const config = Config({}, exitSpy, randomStringFactorySpy, clustersFactorySpy, readFileSpy);
            expect(config.proxyLocation).toEqual(defaultEnvValue);
        });

        it("value", () => {
            const testEnvValue = envKey;
            const config = Config({ [envKey]: testEnvValue }, exitSpy, randomStringFactorySpy, clustersFactorySpy, readFileSpy);
            expect(config.proxyLocation).toEqual(testEnvValue);
        });
    });

    describe("mediaDir", () => {
        const envKey = "MEDIA_SHARE__MediaDir";
        const defaultEnvValue = "media";

        it("not set => default", () => {
            const config = Config({}, exitSpy, randomStringFactorySpy, clustersFactorySpy, readFileSpy);
            expect(config.mediaDir).toEqual(defaultEnvValue);
        });

        it("value", () => {
            const testEnvValue = envKey;
            const config = Config({ [envKey]: testEnvValue }, exitSpy, randomStringFactorySpy, clustersFactorySpy, readFileSpy);
            expect(config.mediaDir).toEqual(testEnvValue);
        });
    });

    describe("certCrt", () => {
        const defaultValue: string | undefined = undefined;
        const firstFilePath = "/run/secrets/cert.crt";
        const secondFilePath = "certs/cert.crt";
        const envKey = "MEDIA_SHARE__CertCrt";
        const thirdFilePath = "thirdFilePath";

        it("no file exist => default", () => {
            const config = Config({}, exitSpy, randomStringFactorySpy, clustersFactorySpy, readFileSpy);
            expect(config.certCrt).toEqual(defaultValue);
        });

        it("first file preferred", () => {
            const fileData = `fileData-${firstFilePath}`;
            readFileSpy.and.callFake((path: string) => path === firstFilePath ? fileData : undefined);
            const config = Config({}, exitSpy, randomStringFactorySpy, clustersFactorySpy, readFileSpy);
            expect(config.certCrt).toEqual(fileData);
        });

        it("second file preferred", () => {
            const fileData = `fileData-${secondFilePath}`;
            readFileSpy.and.callFake((path: string) => path === secondFilePath ? fileData : undefined);
            const config = Config({}, exitSpy, randomStringFactorySpy, clustersFactorySpy, readFileSpy);
            expect(config.certCrt).toEqual(fileData);
        });

        it("third file (from env) preferred", () => {
            const fileData = `fileData-${thirdFilePath}`;
            readFileSpy.and.callFake((path: string) => path === thirdFilePath ? fileData : undefined);
            const config = Config({ [envKey]: thirdFilePath }, exitSpy, randomStringFactorySpy, clustersFactorySpy, readFileSpy);
            expect(config.certCrt).toEqual(fileData);
        });
    });

    describe("certKey", () => {
        const defaultValue: string | undefined = undefined;
        const firstFilePath = "/run/secrets/cert.key";
        const secondFilePath = "certs/cert.key";
        const envKey = "MEDIA_SHARE__CertKey";
        const thirdFilePath = "thirdFilePath";

        it("no file exist => default", () => {
            const config = Config({}, exitSpy, randomStringFactorySpy, clustersFactorySpy, readFileSpy);
            expect(config.certKey).toEqual(defaultValue);
        });

        it("first file preferred", () => {
            const fileData = `fileData-${firstFilePath}`;
            readFileSpy.and.callFake((path: string) => path === firstFilePath ? fileData : undefined);
            const config = Config({}, exitSpy, randomStringFactorySpy, clustersFactorySpy, readFileSpy);
            expect(config.certKey).toEqual(fileData);
        });

        it("second file preferred", () => {
            const fileData = `fileData-${secondFilePath}`;
            readFileSpy.and.callFake((path: string) => path === secondFilePath ? fileData : undefined);
            const config = Config({}, exitSpy, randomStringFactorySpy, clustersFactorySpy, readFileSpy);
            expect(config.certKey).toEqual(fileData);
        });

        it("third file (from env) preferred", () => {
            const fileData = `fileData-${thirdFilePath}`;
            readFileSpy.and.callFake((path: string) => path === thirdFilePath ? fileData : undefined);
            const config = Config({ [envKey]: thirdFilePath }, exitSpy, randomStringFactorySpy, clustersFactorySpy, readFileSpy);
            expect(config.certKey).toEqual(fileData);
        });
    });

    describe("clusters", () => {
        it("not development => injected", () => {
            const testClustersValue = 42;
            clustersFactorySpy.and.returnValue(testClustersValue);
            const config = Config({}, exitSpy, randomStringFactorySpy, clustersFactorySpy, readFileSpy);
            expect(clustersFactorySpy).toHaveBeenCalled();
            expect(config.clusters).toEqual(testClustersValue);
        });

        it("development => 1", () => {
            const config = Config({ "NODE_ENV": "development" }, exitSpy, randomStringFactorySpy, clustersFactorySpy, readFileSpy);
            expect(clustersFactorySpy).not.toHaveBeenCalled();
            expect(config.clusters).toEqual(1);
        });
    });

    describe("rateLimitMinutes", () => {
        const envKey = "MEDIA_SHARE__RateLimitMinutes";
        const defaultEnvValue = 5;

        it("not set => default", () => {
            const config = Config({}, exitSpy, randomStringFactorySpy, clustersFactorySpy, readFileSpy);
            expect(exitSpy).not.toHaveBeenCalled();
            expect(config.rateLimitMinutes).toEqual(defaultEnvValue);
        });

        it("invalid => exit", () => {
            const testEnvValue = String(1 + 24 * 60);
            const config = Config({ [envKey]: testEnvValue }, exitSpy, randomStringFactorySpy, clustersFactorySpy, readFileSpy);
            expect(exitSpy).toHaveBeenCalledOnceWith(envKey);
            expect(config.rateLimitMinutes).not.toBeDefined();
        });

        it("value", () => {
            const testEnvValue = String(42);
            const config = Config({ [envKey]: testEnvValue }, exitSpy, randomStringFactorySpy, clustersFactorySpy, readFileSpy);
            expect(exitSpy).not.toHaveBeenCalled();
            expect(config.rateLimitMinutes).toEqual(+testEnvValue);
        });
    });

    describe("rateLimitCounter", () => {
        it("value", () => {
            const rateLimitMinutes = 42;
            const clusters = clustersFactorySpy();
            const config = Config({ "MEDIA_SHARE__RateLimitMinutes": String(rateLimitMinutes) }, exitSpy, randomStringFactorySpy, clustersFactorySpy, readFileSpy);
            expect(config.clusters).toEqual(clusters);
            expect(config.rateLimitMinutes).toEqual(rateLimitMinutes);
            expect(config.rateLimitCounter).toEqual(rateLimitMinutes * 60 * 5 / clusters);
        });
    });
});
