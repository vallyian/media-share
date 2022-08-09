/* eslint-disable @typescript-eslint/no-var-requires -- project is set to module but tests are commonjs */

import fs from "node:fs";

import * as process from "./internals/process";

describe("env", () => {
    const validFormatClientId = "test.apps.googleusercontent.com";
    const validFormatEmails = "test@gmail.com";

    beforeEach(() => {
        spyOn(fs, "existsSync").and.returnValue(false);
        delete require.cache[require.resolve("./env")];
        process.env["G_CLIENT_ID"] = validFormatClientId;
        process.env["G_EMAILS"] = validFormatEmails;
    });

    describe("G_CLIENT_ID", () => {
        it("process exit if missing", () => {
            const testError = Error("test process exit");
            spyOn(process, "exit").and.throwError(testError);
            delete process.env["G_CLIENT_ID"];
            const env = () => require("./env");
            expect(env).toThrow(testError);
        });

        it("process exit if invalid format", () => {
            const testError = Error("test process exit");
            spyOn(process, "exit").and.throwError(testError);
            process.env["G_CLIENT_ID"] = "test.unexpected.com";
            const env = () => require("./env");
            expect(env).toThrow(testError);
        });

        it("is set", () => {
            process.env["G_CLIENT_ID"] = validFormatClientId;
            const { env } = require("./env");
            expect(env.G_CLIENT_ID).toEqual(validFormatClientId);
        });

    });

    describe("G_EMAILS", () => {
        it("process exit if missing", () => {
            const testError = Error("test process exit");
            spyOn(process, "exit").and.throwError(testError);
            delete process.env["G_EMAILS"];
            const env = () => require("./env");
            expect(env).toThrow(testError);
        });

        it("process exit if invalid format", () => {
            const testError = Error("test process exit");
            spyOn(process, "exit").and.throwError(testError);
            process.env["G_EMAILS"] = "test@email.com";
            const env = () => require("./env");
            expect(env).toThrow(testError);
        });

        it("is set", () => {
            process.env["G_EMAILS"] = validFormatEmails;
            const { env } = require("./env");
            expect(env.G_EMAILS).toEqual([validFormatEmails]);
        });

        it("list is set", () => {
            const testEmails = [validFormatEmails, "test-2@gmail.com"];
            process.env["G_EMAILS"] = testEmails.join(",");
            const { env } = require("./env");
            expect(env.G_EMAILS).toEqual(testEmails);
        });
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
});
