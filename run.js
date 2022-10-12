const fs = require("fs");
const path = require("path");
const childProcess = require("child_process");
const http = require("http");

const dockerUser = process.env["DOCKER_USERNAME"] || "vallyian";
const dockerRepo = process.env["DOCKER_REPO"] || "media-share";
const isGithubAction = (process.env["GITHUB_SHA"] || "") !== "";
const isGithubMain = process.env["GITHUB_MAIN"] === "true";
const semver = process.env["SEMVER"] || "0.0.0";
const npmAuditLevel = process.env["NPM_AUDIT_LEVEL"] || "low";
const trivySeverity = process.env["TRIVY_SEVERITY"] || "UNKNOWN,LOW,MEDIUM,HIGH,CRITICAL";
const homeDir = process.env["USERPROFILE"] || process.env["HOME"] || process.cwd();
const artifactsDir = path.normalize(`${process.cwd()}/artifacts`);

(fn => fn[process.argv[2]] ? fn[process.argv[2]]() : term(`USAGE:   ./run   ${Object.keys(fn).join(" | ")}`))({
    build,
    smoke,
    scan,
    results,
    push,
    ci
});

/** Build Docker image */
async function build() {
    fs.rmSync("artifacts", { recursive: true, force: true });
    fs.mkdirSync("artifacts", { recursive: true });

    await execAsync("docker", ["buildx", "build",
        ...(isGithubAction ? ["--pull"] : []),
        "--target", "export",
        "--build-arg", `NPM_AUDIT_LEVEL=${npmAuditLevel}`,
        "--output", `type=local,dest=${artifactsDir}`,
        "."
    ]);

    await execAsync("docker", ["buildx", "build",
        ...(isGithubAction ? ["--pull"] : []),
        "--tag", `${dockerUser}/${dockerRepo}:${semver}`,
        "--build-arg", `SEMVER=${semver}`,
        "--output", "type=docker",
        "."
    ]);

    await execAsync("docker", ["image", "inspect", `${dockerUser}/${dockerRepo}:${semver}`], { out: false });

    console.log("build success");
}

/** Run a quick smoke test on the Docker image to prove app starts and serves files as intended */
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

    await smokeStartServer(container, testMediaDir)
        .then(async () => {
            await smokeRunTestCase(++testCaseId, "/test-dir", 200, "/dir-index.js").catch(() => failed = true);
            await smokeRunTestCase(++testCaseId, "/test-dir/test.mp3", 200, "/media-player.js").catch(() => failed = true);
            await smokeRunTestCase(++testCaseId, "/test-dir/test.mp4", 200, "/media-player.js").catch(() => failed = true);
            await smokeRunTestCase(++testCaseId, "/test-dir/test.srt", 200, "WEBVTT").catch(() => failed = true);
            await smokeRunTestCase(++testCaseId, "/test-dir/test.sub", 200, "WEBVTT").catch(() => failed = true);
        })
        .catch(() => failed = true)
        .finally(() => smokeStopServer(container));

    await smokeStartServer(container, testMediaDir, "test.apps.googleusercontent.com", "test@gmail.com")
        .then(async () => {
            await smokeRunTestCase(++testCaseId, "/test-dir", 401, "").catch(() => failed = true);
        })
        .catch(() => failed = true)
        .finally(() => smokeStopServer(container));

    fs.rmSync(testMediaDir, { recursive: true, force: true });
    fs.readdirSync(smokeTestDir).length || fs.rmSync(smokeTestDir, { recursive: true });

    if (failed) term(`smoke test failed`);
    console.log("smoke success");
}
function smokeStartServer(container, testMediaDir, authClient = "", authEmails = "") {
    const port = 58081;

    exec("docker", ["run",
        "--name", container,
        "--detach",
        "-p", `127.0.0.1:${port}:58082`,
        "-v", `${testMediaDir}:/home/node/media`,
        "-e", `MEDIA_SHARE__AuthClient=${authClient}`,
        "-e", `MEDIA_SHARE__AuthEmails=${authEmails}`,
        `${dockerUser}/${dockerRepo}:${semver}`
    ]);

    const interval = () => new Promise(ok => setTimeout(() => ok(httpRequest(`http://localhost:${port}/health`).catch(err => err).then(health => {
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
            return false
        });
}
function smokeRunTestCase(testCaseId, url, status, body) {
    return httpRequest(`http://localhost:58081${url}`)
        .then(res => {
            if (res.status !== status || !res.body.includes(body)) throw res;
            console.log({ testCaseId, url, expected: { status, body }, actual: { ...res } });
        })
        .catch(err => {
            console.error({ testCaseId, url, expected: { status, body }, actual: { err } });
            throw err;
        });
}
async function smokeStopServer(container) {
    await execAsync("docker", ["container", "stop", container], { out: false, err: false }).catch(() => void 0);
    await execAsync("docker", ["container", "rm", container], { out: false, err: false }).catch(() => void 0);
}

/** Scan Docker image for vulnerabilities */
async function scan() {
    await execAsync("docker", ["run",
        "--rm",
        "--pull", "always",
        "-v", "/var/run/docker.sock:/var/run/docker.sock",
        "-v", `${homeDir}/.trivy/cache:/root/.cache`,
        "aquasec/trivy",
        "image",
        "--exit-code", 1,
        "--severity", trivySeverity,
        `${dockerUser}/${dockerRepo}:${semver}`
    ]);
    console.log("scan success");
}

/** Check if unit test results are created and lint or test failed */
function results() {
    const errors = [];

    if (!fs.readdirSync(path.normalize(`${artifactsDir}/unit-tests`)).find(f => f.endsWith(".xml"))) errors.push("npm test results not found");
    if (fs.existsSync(path.normalize(`${artifactsDir}/npm-test.fail`))) errors.push("npm test failed");
    if (fs.existsSync(path.normalize(`${artifactsDir}/npm-lint.fail`))) errors.push("npm lint failed");

    if (errors.length) term(errors.join("\n")); else console.log("results success");
}

/** Push multiplatform image to public Docker Hub repo */
async function push() {
    if (semver === "0.0.0") term("push can only run in CI");
    await execAsync("docker", ["buildx", "build",
        "--pull",
        "--output", "type=registry",
        ...(isGithubMain ? ["--tag", `${dockerUser}/${dockerRepo}:latest`] : []),
        "--tag", `${dockerUser}/${dockerRepo}:${semver}`,
        "--build-arg", `SEMVER=${semver}`,
        "--platform", "linux/amd64,linux/arm64/v8",
        "."
    ]);
    console.log("push success");
}

/** Run build, test, scan and check results locally, same as in CI */
async function ci() {
    await build();
    await smoke();
    await scan();
    results();
    console.log("ci success");
}

/**
 * Issues a http.get request
 * @param {string} url
 * @returns {Promise<{status: number, body: string, err?: Error}>} {status: number, body: string, err?: Error}
 * @throws {Error} rejects if url is invalid
 * @throws {Error} rejects if request can't be issued
 */
function httpRequest(url) {
    return Promise.resolve()
        .then(() => url = new URL(url).href)
        .then(() => new Promise((ok, reject) => http.get(url, response => {
            let body = "";
            response.setEncoding("utf-8");
            response.on("data", chunk => body += chunk);
            response.on("error", err => ok({ status: response.statusCode || -1, body, err }));
            response.on("end", () => ok({ status: response.statusCode || -1, body }));
        }).on("error", err => reject(err))))
}

/**
 * Spawn a new process and waits for it to finish
 * @param {string} cmd
 * @param {string[]} args
 * @param {{ out?: boolean, err?: boolean}} options
 * @returns {Promise<void>} Promise<void>
 * @throws rejects with the exit code number
 */
function execAsync(cmd, args, options = { out: true, err: true }) {
    return new Promise((ok, reject) => exec(cmd, args, options).on("exit", code => code ? reject(code) : ok()));
}

/**
 * Spawn a new process without waiting for it to finish
 * @param {string} cmd
 * @param {string[]} args
 * @param {{ out?: boolean, err?: boolean}} options
 * @returns {childProcess.ChildProcessWithoutNullStreams} childProcess.ChildProcessWithoutNullStreams
 */
function exec(cmd, args, options = { out: true, err: true }) {
    const child = childProcess.spawn(cmd, (args || []).filter(c => c && !!(String(c).trim())), { shell: false, cwd: process.cwd() });
    if (options && options.out) child.stdout.pipe(process.stdout);
    if (options && options.err) child.stderr.pipe(process.stderr);
    return child;
}

/**
 * Logs the error and kills process immediately
 * @param {string | object} err
 * @returns {never} never
 */
function term(err) { console.error(`\x1b[31m${typeof err === "string" ? err : JSON.stringify(err)}\x1b[0m`); process.exit(1); }
