const fs = require("fs");
const path = require("path");
const childProcess = require("child_process");
const http = require("http");

const dockerUser = process.env["DOCKER_USERNAME"] || "vallyian";
const dockerRepo = process.env["DOCKER_REPO"] || "media-share";
const isGhMain = process.env["GITHUB_MAIN"] || "false";
const newVersion = process.env["NEW_VERSION"] || "";
const ghSha = process.env["GITHUB_SHA"] || "";
const semver = process.env["SEMVER"] || "0.0.0";
const npmAuditLevel = process.env["NPM_AUDIT_LEVEL"] || "low";
const trivySeverity = process.env["TRIVY_SEVERITY"] || "UNKNOWN,LOW,MEDIUM,HIGH,CRITICAL";
const home = process.env["USERPROFILE"] || process.env["HOME"];
const artifactsDir = path.normalize(`${process.cwd()}/artifacts`);

(fn => fn[process.argv[2]] ? fn[process.argv[2]]() : term(`USAGE:   ./run   ${Object.keys(fn).join(" | ")}`))({
    semver: calcSemver,
    build,
    smoke,
    scan,
    results,
    push,
    ci
});

function calcSemver() {
    if (newVersion === "") term("semver can only run in CI");

    if (isGhMain === "true") {
        console.log(`::set-output name=SEMVER::${newVersion}`);
        console.log(`SEMVER: ${newVersion}`);
    } else {
        console.log(`::set-output name=SEMVER::${newVersion}-${ghSha}`);
        console.log(`SEMVER: ${newVersion}-${ghSha}`);
    }
}

async function build() {
    fs.rmSync("artifacts", { recursive: true, force: true });
    fs.mkdirSync("artifacts", { recursive: true });

    await execAsync([`docker`, `buildx`, `build`, `--output="type=local,dest=${artifactsDir}"`, `--target="export"`,
        ghSha === "" ? "" : "--pull",
        `--build-arg="NPM_AUDIT_LEVEL=${npmAuditLevel}"`,
        "."]);

    await execAsync([`docker`, `buildx`, `build`, `--output="type=docker"`,
        ghSha === "" ? "" : "--pull",
        `--tag="${dockerUser}/${dockerRepo}:${semver}"`,
        `--build-arg="SEMVER=${semver}"`,
        "."]);

    await execAsync([`docker`, `image`, `inspect`, `${dockerUser}/${dockerRepo}:${semver}`], { stdout: false });

    console.log("build success");
}

async function smoke() {
    const container = `${dockerUser}-${dockerRepo}-${semver}-smoke-test`;
    const smokeTestDir = path.join(artifactsDir, "smoke-test");
    const testMediaDir = path.join(smokeTestDir, "media");
    const testMediaChildDir = path.join(testMediaDir, "test-dir");
    let failed = false;
    let testCaseId = 0;

    fs.rmSync(smokeTestDir, { recursive: true, force: true });
    fs.mkdirSync(testMediaChildDir, { recursive: true });
    fs.writeFileSync(path.join(testMediaChildDir, "test.mp3"), "", "utf-8");
    fs.writeFileSync(path.join(testMediaChildDir, "test.mp4"), "", "utf-8");
    fs.writeFileSync(path.join(testMediaChildDir, "test.srt"), "00:00:00,000 --> 00:00:01,000\ntest", "utf-8");
    fs.writeFileSync(path.join(testMediaChildDir, "test.sub"), "{0}{25}test", "utf-8");

    await startTestServer(container, testMediaDir)
        .then(async () => {
            await smokeTestCase(++testCaseId, "/test-dir", 200, "/dir-index.js").catch(() => failed = true);
            await smokeTestCase(++testCaseId, "/test-dir/test.mp3", 200, "/media-player.js").catch(() => failed = true);
            await smokeTestCase(++testCaseId, "/test-dir/test.mp4", 200, "/media-player.js").catch(() => failed = true);
            await smokeTestCase(++testCaseId, "/test-dir/test.srt", 200, "WEBVTT").catch(() => failed = true);
            await smokeTestCase(++testCaseId, "/test-dir/test.sub", 200, "WEBVTT").catch(() => failed = true);
        })
        .catch(() => failed = true);
    await stopTestServer(container);

    await startTestServer(container, testMediaDir, "test.apps.googleusercontent.com", "test@gmail.com")
        .then(async () => {
            await smokeTestCase(++testCaseId, "/test-dir", 401, "").catch(() => failed = true);
        })
        .catch(() => failed = true);
    await stopTestServer(container);

    if (failed) term(`smoke test failed`);
    console.log("smoke success");
}

function startTestServer(container, testMediaDir, authClient = "", authEmails = "") {
    exec([
        `docker run --name ${container} --detach`,
        `-p="58081:58082"`,
        `-v="${testMediaDir}:/home/node/media"`,
        `-e="MEDIA_SHARE__AuthClient=${authClient}"`,
        `-e="MEDIA_SHARE__AuthEmails=${authEmails}"`,
        `${dockerUser}/${dockerRepo}:${semver}`
    ]);

    const interval = () => new Promise(ok => setTimeout(() => ok(httpRequest("http://localhost:58081/health").catch(err => err).then(health => {
        if (health.body !== "healthy") {
            console.error({ health });
            return interval();
        }
    })), 1000));

    const timeout = () => new Promise((_, reject) => setTimeout(() => reject("timeout waiting for health endpoint"), 30000));

    return Promise.race([interval(), timeout()])
        .then(() => true)
        .catch(err => {
            console.error({ server: { err } });
            return false;
        });
};

function smokeTestCase(testCaseId, url, status, body) {
    return httpRequest(`http://localhost:58081${url}`)
        .then(res => { if (res.status !== status || !res.body.includes(body)) throw res; })
        .catch(err => {
            console.error({ testCaseId, url, expected: { status, body }, actual: { err } });
            throw err;
        });
}

async function stopTestServer(container) {
    await execAsync(`docker container stop ${container}`, { stdout: false, stderr: false }).catch(() => void 0);
    await execAsync(`docker container rm ${container}`, { stdout: false, stderr: false }).catch(() => void 0);
    await execAsync(`docker container inspect ${container}`, { stdout: false, stderr: false }).catch(() => void 0);
}

async function scan() {
    await execAsync([
        `docker run --rm --pull="always"`,
        `-v="/var/run/docker.sock:/var/run/docker.sock"`,
        `-v="${home}/.trivy/cache:/root/.cache"`,
        `aquasec/trivy`,
        `image`,
        `--exit-code=1`,
        `--severity="${trivySeverity}"`,
        `${dockerUser}/${dockerRepo}:${semver}`
    ]);
    console.log("scan success");
}

function results() {
    const errors = [];

    if (fs.existsSync(path.normalize(`${artifactsDir}/npm-test.fail`))) errors.push("npm test failed");
    if (fs.existsSync(path.normalize(`${artifactsDir}/npm-lint.fail`))) errors.push("npm lint failed");
    if (!fs.readdirSync(path.normalize(`${artifactsDir}/unit-tests`)).find(f => f.endsWith(".xml"))) errors.push("npm test results not found");

    if (errors.length) term(errors.join("\n")); else console.log("results success");
}

async function push() {
    if (semver === "0.0.0") term("push can only run in CI");
    await execAsync([
        `docker buildx build --pull --output="type=registry"`,
        isGhMain === "true" ? `--tag="${dockerUser}/${dockerRepo}:latest"` : "",
        `--tag="${dockerUser}/${dockerRepo}:${semver}"`,
        `--build-arg="SEMVER=${semver}"`,
        `--platform="linux/amd64,linux/arm64/v8"`,
        `.`
    ]);
    console.log("push success");
}

async function ci() {
    await build();
    await smoke();
    await scan();
    results();
    console.log("ci success");
}

function httpRequest(url) {
    return new Promise((ok, reject) => http.get(url, response => {
        let body = "";
        response.setEncoding("utf-8");
        response.on("data", chunk => body += chunk);
        response.on("error", err => ok({ status: response.statusCode, body, err }));
        response.on("end", () => ok({ status: response.statusCode, body }));
    }).on("error", err => reject(err)));
}

function execAsync(cmd, options = { stdout: true, stderr: true }) {
    return new Promise((ok, reject) => exec(cmd, options).on("exit", code => code ? reject() : ok()));
}

function exec(cmd, options = { stdout: true, stderr: true }) {
    const child = childProcess.exec(cmd instanceof Array ? cmd.join(" ") : cmd, { shell: false });
    if (options && options.stdout) child.stdout.pipe(process.stdout);
    if (options && options.stderr) child.stderr.pipe(process.stderr);
    return child;
}

function term(err) { console.error(`\x1b[31m${err}\x1b[0m`); process.exit(1); }
