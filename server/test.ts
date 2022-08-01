import Jasmine from "jasmine";
import { SpecReporter, StacktraceOption } from "jasmine-spec-reporter";
// eslint-disable-next-line @typescript-eslint/ban-ts-comment
// @ts-ignore
import { JUnitXmlReporter } from "jasmine-reporters";

import packageJson from "./package.json";

const runner = new Jasmine();

runner.loadConfig({
    spec_files: ["src/**/*.spec.ts"],
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
        savePath: "./test-results",
        consolidateAll: false,
        filePrefix: packageJson.name.replace(/[^a-zA-Z0-9]/g, "") + "_" + new Date().toISOString().replace(/[^0-9]/g, "_")
    })
);

runner.execute().catch((e: Error) => {
    globalThis.console.error("test run failed:", e);
    globalThis.process.exit(1);
});
