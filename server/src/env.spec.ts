/* eslint-disable @typescript-eslint/no-var-requires -- project is set to module but tests are commonjs */

import * as os from "node:os";

describe("env", () => {
    beforeEach(() => {
        delete require.cache[require.resolve("./env")];
        process.env["MEDIA_DIR"] = "test-media-dir";
    });

    describe("NODE_ENV", () => {
        it("default is production", () => {
            delete process.env["NODE_ENV"];
            const { env } = require("./env");
            expect(env.NODE_ENV).toEqual("production");
        });

        it("is overwritten", () => {
            process.env["NODE_ENV"] = "overwritten";
            const { env } = require("./env");
            expect(env.NODE_ENV).toEqual(process.env["NODE_ENV"]);
        });
    });

    describe("CLUSTERS", () => {
        it("default is os.cpus", () => {
            delete process.env["NODE_ENV"];
            const { env } = require("./env");
            expect(env.CLUSTERS).toEqual(os.cpus().length);
        });

        it("for dev is 1", () => {
            delete process.env["NODE_ENV"];
            process.env["NODE_ENV"] = "development";
            const { env } = require("./env");
            expect(env.CLUSTERS).toEqual(1);
        });
    });

    describe("PORT", () => {
        it("default is 58082", () => {
            delete process.env["PORT"];
            const { env } = require("./env");
            expect(env.PORT).toEqual(58082);
        });

        it("is overwritten", () => {
            process.env["PORT"] = "42";
            const { env } = require("./env");
            expect(env.PORT).toEqual(+process.env["PORT"]);
        });
    });

    describe("MEDIA_DIR", () => {
        it("default is /media", () => {
            delete process.env["MEDIA_DIR"];
            const { env } = require("./env");
            expect(env.MEDIA_DIR).toEqual("/media");
        });

        it("is overwritten", () => {
            process.env["MEDIA_DIR"] = "overwritten";
            const { env } = require("./env");
            expect(env.MEDIA_DIR).toEqual(process.env["MEDIA_DIR"]);
        });
    });

    describe("CERT_CRT", () => {
        it("default is /run/secrets/cert.crt", () => {
            delete process.env["CERT_CRT"];
            const { env } = require("./env");
            expect(env.CERT_CRT).toEqual("/run/secrets/cert.crt");
        });

        it("is overwritten", () => {
            process.env["CERT_CRT"] = "overwritten";
            const { env } = require("./env");
            expect(env.CERT_CRT).toEqual(process.env["CERT_CRT"]);
        });
    });

    describe("CERT_KEY", () => {
        it("default is /run/secrets/cert.key", () => {
            delete process.env["CERT_KEY"];
            const { env } = require("./env");
            expect(env.CERT_KEY).toEqual("/run/secrets/cert.key");
        });

        it("is overwritten", () => {
            process.env["CERT_KEY"] = "overwritten";
            const { env } = require("./env");
            expect(env.CERT_KEY).toEqual(process.env["CERT_KEY"]);
        });
    });
});
