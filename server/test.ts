import Jasmine from "jasmine";
import { JUnitXmlReporter } from "jasmine-reporters";
import { SpecReporter, StacktraceOption } from "jasmine-spec-reporter";

import { name } from "./package.json";

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
        filePrefix: name.replace(/[^a-zA-Z0-9]/g, "") + "_" + new Date().toISOString().replace(/[^0-9]/g, "_")
    })
);

await runner.execute();
