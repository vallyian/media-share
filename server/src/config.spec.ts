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
            const config = new Config({}, exitSpy, randomStringFactorySpy, clustersFactorySpy, readFileSpy);
            expect(config.NODE_ENV).toEqual(defaultEnvValue);
        });

        it("value", () => {
            const testEnvValue = envKey;
            const config = new Config({ [envKey]: testEnvValue }, exitSpy, randomStringFactorySpy, clustersFactorySpy, readFileSpy);
            expect(config.NODE_ENV).toEqual(testEnvValue);
        });
    });

    describe("authClient", () => {
        const envKey = "MEDIA_SHARE__AuthClient";
        const defaultEnvValue = "";

        it("not set => default", () => {
            const config = new Config({}, exitSpy, randomStringFactorySpy, clustersFactorySpy, readFileSpy);
            expect(config.authClient).toEqual(defaultEnvValue);
        });

        it("valid", () => {
            const testEnvValue = envKey;
            const config = new Config({ [envKey]: testEnvValue }, exitSpy, randomStringFactorySpy, clustersFactorySpy, readFileSpy);
            expect(config.authClient).toEqual(testEnvValue);
        });
    });

    describe("authEmails", () => {
        const envKey = "MEDIA_SHARE__AuthEmails";
        const defaultEnvValue = new Array<string>();

        it("not set => default", () => {
            const config = new Config({}, exitSpy, randomStringFactorySpy, clustersFactorySpy, readFileSpy);
            expect(config.authEmails).toEqual(defaultEnvValue);
        });

        it("invalid => default", () => {
            const testEnvValue = `${envKey},     ,,,  ,`;
            const config = new Config({ [envKey]: testEnvValue }, exitSpy, randomStringFactorySpy, clustersFactorySpy, readFileSpy);
            expect(config.authEmails).toEqual(defaultEnvValue);
        });

        it("valid", () => {
            const testEnvValue = `${envKey}@email.1,${envKey}@email.2`;
            const config = new Config({ [envKey]: testEnvValue }, exitSpy, randomStringFactorySpy, clustersFactorySpy, readFileSpy);
            expect(config.authEmails).toEqual(testEnvValue.split(","));
        });

        it("valid (mixed valid and invalid values)", () => {
            const testEnvValidValues = `${envKey}@email.1,${envKey}@email.2`;
            const testEnvInvalidValues = `${envKey},     ,,,  ,`;
            const testEnvValue = `${testEnvValidValues},${testEnvInvalidValues}`;
            const config = new Config({ [envKey]: testEnvValue }, exitSpy, randomStringFactorySpy, clustersFactorySpy, readFileSpy);
            expect(config.authEmails).toEqual(testEnvValidValues.split(","));
        });
    });

    describe("tokenKey", () => {
        const envKey = "MEDIA_SHARE__TokenKey";
        const defaultRandomStringLength = 32;

        it("not set => random auto regenerated", () => {
            const config = new Config({}, exitSpy, randomStringFactorySpy, clustersFactorySpy, readFileSpy);
            expect(randomStringFactorySpy).toHaveBeenCalledWith(defaultRandomStringLength);
            expect(config.tokenKey.length).toBeGreaterThan(defaultRandomStringLength);
        });

        it("value", () => {
            const testEnvValue = envKey;
            const config = new Config({ [envKey]: testEnvValue }, exitSpy, randomStringFactorySpy, clustersFactorySpy, readFileSpy);
            expect(config.tokenKey).toEqual(testEnvValue);
        });
    });

    describe("cookieSecret", () => {
        const envKey = "MEDIA_SHARE__CookieSecret";
        const defaultRandomStringLength = 32;

        it("not set => random auto regenerated", () => {
            const config = new Config({}, exitSpy, randomStringFactorySpy, clustersFactorySpy, readFileSpy);
            expect(randomStringFactorySpy).toHaveBeenCalledWith(defaultRandomStringLength);
            expect(config.cookieSecret.length).toBeGreaterThan(defaultRandomStringLength);
        });

        it("value", () => {
            const testEnvValue = envKey;
            const config = new Config({ [envKey]: testEnvValue }, exitSpy, randomStringFactorySpy, clustersFactorySpy, readFileSpy);
            expect(config.cookieSecret).toEqual(testEnvValue);
        });
    });

    describe("port", () => {
        const envKey = "MEDIA_SHARE__Port";
        const defaultEnvValue = 58082;

        it("not set => default", () => {
            const config = new Config({}, exitSpy, randomStringFactorySpy, clustersFactorySpy, readFileSpy);
            expect(exitSpy).not.toHaveBeenCalled();
            expect(config.port).toEqual(defaultEnvValue);
        });

        it("invalid => exit", () => {
            const testEnvValue = String(1 + 65535);
            new Config({ [envKey]: testEnvValue }, exitSpy, randomStringFactorySpy, clustersFactorySpy, readFileSpy);
            expect(exitSpy).toHaveBeenCalledOnceWith(envKey);
        });

        it("value", () => {
            const testEnvValue = String(42);
            const config = new Config({ [envKey]: testEnvValue }, exitSpy, randomStringFactorySpy, clustersFactorySpy, readFileSpy);
            expect(exitSpy).not.toHaveBeenCalled();
            expect(config.port).toEqual(+testEnvValue);
        });
    });

    describe("rateLimitMinutes", () => {
        const envKey = "MEDIA_SHARE__RateLimitMinutes";
        const defaultEnvValue = 5;

        it("not set => default", () => {
            const config = new Config({}, exitSpy, randomStringFactorySpy, clustersFactorySpy, readFileSpy);
            expect(exitSpy).not.toHaveBeenCalled();
            expect(config.rateLimitMinutes).toEqual(defaultEnvValue);
        });

        it("invalid => exit", () => {
            const testEnvValue = String(1 + 24 * 60);
            new Config({ [envKey]: testEnvValue }, exitSpy, randomStringFactorySpy, clustersFactorySpy, readFileSpy);
            expect(exitSpy).toHaveBeenCalledOnceWith(envKey);
        });

        it("value", () => {
            const testEnvValue = String(42);
            const config = new Config({ [envKey]: testEnvValue }, exitSpy, randomStringFactorySpy, clustersFactorySpy, readFileSpy);
            expect(exitSpy).not.toHaveBeenCalled();
            expect(config.rateLimitMinutes).toEqual(+testEnvValue);
        });
    });

    describe("proxyLocation", () => {
        const envKey = "MEDIA_SHARE__ProxyLocation";
        const defaultEnvValue = "/";

        it("not set => default", () => {
            const config = new Config({}, exitSpy, randomStringFactorySpy, clustersFactorySpy, readFileSpy);
            expect(config.proxyLocation).toEqual(defaultEnvValue);
        });

        it("value", () => {
            const testEnvValue = envKey;
            const config = new Config({ [envKey]: testEnvValue }, exitSpy, randomStringFactorySpy, clustersFactorySpy, readFileSpy);
            expect(config.proxyLocation).toEqual(testEnvValue);
        });
    });

    describe("clusters", () => {
        it("not development => injected", () => {
            const testClustersValue = 42;
            clustersFactorySpy.and.returnValue(testClustersValue);
            const config = new Config({}, exitSpy, randomStringFactorySpy, clustersFactorySpy, readFileSpy);
            expect(clustersFactorySpy).toHaveBeenCalled();
            expect(config.clusters).toEqual(testClustersValue);
        });

        it("development => 1", () => {
            const config = new Config({ "NODE_ENV": "development" }, exitSpy, randomStringFactorySpy, clustersFactorySpy, readFileSpy);
            expect(clustersFactorySpy).not.toHaveBeenCalled();
            expect(config.clusters).toEqual(1);
        });
    });

    describe("rateLimitCounter", () => {
        it("value", () => {
            const rateLimitMinutes = 42;
            const clusters = clustersFactorySpy();
            const config = new Config({ "MEDIA_SHARE__RateLimitMinutes": String(rateLimitMinutes) }, exitSpy, randomStringFactorySpy, clustersFactorySpy, readFileSpy);
            expect(config.clusters).toEqual(clusters);
            expect(config.rateLimitMinutes).toEqual(rateLimitMinutes);
            expect(config.rateLimitCounter).toEqual(rateLimitMinutes * 60 * 5 / clusters);
        });
    });

    describe("mediaDir", () => {
        it("value", () => {
            const config = new Config({}, exitSpy, randomStringFactorySpy, clustersFactorySpy, readFileSpy);
            expect(config.mediaDir).toEqual("media");
        });
    });

    describe("certCrt", () => {
        const defaultValue: string | undefined = undefined;
        const firstFilePath = "/run/secrets/cert.crt";
        const secondFilePath = "certs/cert.crt";

        it("neither file exist => default", () => {
            const config = new Config({}, exitSpy, randomStringFactorySpy, clustersFactorySpy, readFileSpy);
            expect(config.certCrt).toEqual(defaultValue);
        });

        it("first file exists", () => {
            const fileData = firstFilePath;
            readFileSpy.and.callFake((path: string) => path === firstFilePath ? fileData : undefined);
            const config = new Config({}, exitSpy, randomStringFactorySpy, clustersFactorySpy, readFileSpy);
            expect(config.certCrt).toEqual(fileData);
        });

        it("first file does not exist but second file exists", () => {
            const fileData = secondFilePath;
            readFileSpy.and.callFake((path: string) => path === secondFilePath ? fileData : undefined);
            const config = new Config({}, exitSpy, randomStringFactorySpy, clustersFactorySpy, readFileSpy);
            expect(config.certCrt).toEqual(fileData);
        });
    });

    describe("certKey", () => {
        const defaultValue: string | undefined = undefined;
        const firstFilePath = "/run/secrets/cert.key";
        const secondFilePath = "certs/cert.key";

        it("neither file exist => default", () => {
            const config = new Config({}, exitSpy, randomStringFactorySpy, clustersFactorySpy, readFileSpy);
            expect(config.certKey).toEqual(defaultValue);
        });

        it("first file exists", () => {
            const fileData = firstFilePath;
            readFileSpy.and.callFake((path: string) => path === firstFilePath ? fileData : undefined);
            const config = new Config({}, exitSpy, randomStringFactorySpy, clustersFactorySpy, readFileSpy);
            expect(config.certKey).toEqual(fileData);
        });

        it("first file does not exist but second file exists", () => {
            const fileData = secondFilePath;
            readFileSpy.and.callFake((path: string) => path === secondFilePath ? fileData : undefined);
            const config = new Config({}, exitSpy, randomStringFactorySpy, clustersFactorySpy, readFileSpy);
            expect(config.certKey).toEqual(fileData);
        });
    });
});
