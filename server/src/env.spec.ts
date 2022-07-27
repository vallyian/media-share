/* eslint-disable @typescript-eslint/no-var-requires -- project is set to module but tests are commonjs */

import * as os from "node:os";

describe("env", () => {
    beforeEach(() => {
        delete require.cache[require.resolve("./env")];
        process.env.MEDIA_DIR = "test-media-dir";
    });

    describe("MEDIA_DIR", () => {
        it("throws if not provided", () => {
            delete process.env.MEDIA_DIR;
            const env = () => require("./env");
            expect(env).toThrow();
        });

        it("is overwritten", () => {
            process.env.MEDIA_DIR = "overwritten";
            const { env } = require("./env");
            expect(env.MEDIA_DIR).toEqual(process.env.MEDIA_DIR);
        });
    });

    describe("NODE_ENV", () => {
        it("default is production", () => {
            delete process.env.NODE_ENV;
            const { env } = require("./env");
            expect(env.NODE_ENV).toEqual("production");
        });

        it("is overwritten", () => {
            process.env.NODE_ENV = "overwritten";
            const { env } = require("./env");
            expect(env.NODE_ENV).toEqual(process.env.NODE_ENV);
        });
    });

    describe("CLUSTERS", () => {
        it("default is os.cpus", () => {
            delete process.env.NODE_ENV;
            const { env } = require("./env");
            expect(env.CLUSTERS).toEqual(os.cpus().length);
        });

        it("for dev is 1", () => {
            delete process.env.NODE_ENV;
            process.env.NODE_ENV = "development";
            const { env } = require("./env");
            expect(env.CLUSTERS).toEqual(1);
        });
    });

    describe("PORT", () => {
        it("default is 58082", () => {
            delete process.env.PORT;
            const { env } = require("./env");
            expect(env.PORT).toEqual(58082);
        });

        it("is overwritten", () => {
            process.env.PORT = "42";
            const { env } = require("./env");
            expect(env.PORT).toEqual(+process.env.PORT);
        });
    });

    describe("CERTS_DIR", () => {
        it("default is blank", () => {
            delete process.env.CERTS_DIR;
            const { env } = require("./env");
            expect(env.CERTS_DIR).toEqual("");
        });

        it("is overwritten", () => {
            process.env.CERTS_DIR = "overwritten";
            const { env } = require("./env");
            expect(env.CERTS_DIR).toEqual(process.env.CERTS_DIR);
        });
    });

});
