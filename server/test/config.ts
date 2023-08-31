/* eslint-disable @typescript-eslint/ban-ts-comment */
/* eslint-disable no-restricted-globals */
import Jasmine from "jasmine";
import { SpecReporter, StacktraceOption } from "jasmine-spec-reporter";
// @ts-ignore
import { JUnitXmlReporter } from "jasmine-reporters";

const runner = new Jasmine();

runner.loadConfig({
    spec_files: ["test/**/*.test.ts"],
    stopSpecOnExpectationFailure: true,
    random: true,
});

runner.clearReporters();
runner.addReporter(
    new SpecReporter({
        spec: { displayStacktrace: StacktraceOption.PRETTY },
    })
);
runner.addReporter(
    new JUnitXmlReporter({
        savePath: process.env["outDir"],
        filePrefix: new Date().toISOString().replace(/\D/g, "_"),
        consolidateAll: false
    })
);

runner.execute().catch((e: Error) => {
    console.error("test run failed:", e);
    process.exit(1);
});
