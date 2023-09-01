const fs = require("node:fs");
const path = require("node:path");
const child_process = require("node:child_process");
const http = require("node:http");

(() => {
    process.env.DOCKER_USERNAME = process.env.DOCKER_USERNAME || "vallyian";
    process.env.DOCKER_REPO = process.env.DOCKER_REPO || "media-share";
    process.env.SEMVER = process.env.SEMVER || "0.0.0";
    process.env.NPM_AUDIT_LEVEL = process.env.NPM_AUDIT_LEVEL || "low";
    process.env.TRIVY_SEVERITY = process.env.TRIVY_SEVERITY || "HIGH,CRITICAL"; // UNKNOWN,LOW,MEDIUM,
    process.env.HOME = process.env.HOME || process.env.USERPROFILE || process.cwd();
    process.env.GITHUB_SHA = process.env.GITHUB_SHA || "";
    process.env.GITHUB_MAIN = process.env.GITHUB_MAIN || "";
    // process.env.DOCKER_BUILDKIT = 1
    // process.env.COMPOSE_DOCKER_CLI_BUILD = 1

    restore();
    switch (/* see package.json scripts for usage */ process.argv[2]) {
        case "build": return build(path.resolve(process.argv[3]));
        case "test": return test(path.resolve(process.argv[3]));
        case "lint": return lint(path.resolve(process.argv[3]));
        case "start": return start();
        case "results": return results(path.resolve(process.argv[3]), path.resolve(process.argv[3]));
        case "push": return push();
        case "docker:build": return dockerBuild(path.resolve(process.argv[3]));
        case "docker:scan": return dockerScan();
        case "docker:smoke": return dockerSmokeTest(path.resolve(process.argv[3]));
        default: log(Error("USAGE:   npm run   build [docker] | test [smoke] | lint | start | results | scan | push | docker"));
    }
})();

function restore() {
    if (process.argv[2].startsWith("docker")) return;

    exec("npx -y check-engine");

    const modulesDir = path.resolve("server", "node_modules");
    const platformPath = path.resolve(modulesDir, "platform");
    const platform = fs.existsSync(platformPath) ? fs.readFileSync(platformPath, "utf8") : "";

    if (!fs.existsSync(modulesDir) || process.platform !== platform) {
        exec(`npx npm ci --no-audit`, { cwd: "server" });
        exec(`npx npm audit --audit-level=${process.env.NPM_AUDIT_LEVEL} --omit=dev`, { cwd: "server" });
        fs.writeFileSync(platformPath, process.platform, "utf8");
    }
}

function build(/** @type {string} */ outDir) {
    ensureEmptyDir(outDir);
    exec(`npx tsc --project tsconfig.bin.json --outDir ${outDir}`, { cwd: "server" });

    const { name, version, license, description, keywords, author, repository, engines } = require(path.resolve("package.json"));
    const { dependencies } = require(path.resolve("server", "package.json"));
    fs.writeFileSync(
        path.join(outDir, "package.json"),
        JSON.stringify({
            name, version, license, description, keywords, author, repository, engines,
            private: true,
            type: "commonjs",
            main: "index.js",
            dependencies
        }, null, 4),
        "utf8"
    );
    fs.cpSync(
        path.resolve("server", "src", "service", "views"),
        path.join(outDir, "service", "views"),
        { recursive: true, force: true }
    );
}

function test(/** @type {string} */ outDir) {
    ensureEmptyDir(outDir);
    try {
        exec("npx ts-node test/config.ts", { cwd: "server", env: { ...process.env, outDir } });
        log("test ok");
    } catch (_) {
        fs.writeFileSync(path.join(outDir, ".fail"), "", "utf8");
        log(Error("test failed"))
    }
}

function lint(/** @type {string} */ outDir) {
    ensureEmptyDir(outDir);
    try {
        exec("npx tsc --noEmit", { cwd: "server" });
        exec(`npx eslint src/** --fix`, { cwd: "server" });
        log("lint ok");
    } catch (_) {
        fs.writeFileSync(path.join(outDir, ".fail"), "fail", "utf8");
        log(Error("lint failed"))
    }
}

function start() {
    const proc = child_process.spawn(
        `npx${process.platform === "win32" ? ".cmd" : ""}`,
        "ts-node-dev --files --prefer-ts --debug --inspect --watch -- src".split(/\s+/g),
        { cwd: "server", shell: false }
    );
    proc.stdout.pipe(process.stdout);
    proc.stderr.pipe(process.stderr);
}

function dockerBuild(/** @type {string} */ outDir) {
    ensureEmptyDir(outDir);

    exec(`
        docker buildx build
            ${process.env.GITHUB_SHA !== "" ? "--pull" : ""}
            --target export
            --output type=local,dest=${outDir}
        .
    `);

    exec(`
        docker buildx build
            ${process.env.GITHUB_SHA !== "" ? "--pull" : ""}
            --tag ${process.env.DOCKER_USERNAME}/${process.env.DOCKER_REPO}:${process.env.SEMVER}
            --build-arg SEMVER
            --output type=docker
        .
    `);

    exec(`docker image inspect ${process.env.DOCKER_USERNAME}/${process.env.DOCKER_REPO}:${process.env.SEMVER}`, { stdio: "ignore" });

    log("build success");
}

function dockerScan() {
    exec(`
        docker run --rm --pull always
            -v /var/run/docker.sock:/var/run/docker.sock
            -v ${process.env.HOME}/.trivy/cache:/root/.cache
            aquasec/trivy image
                --exit-code 1
                --severity ${process.env.TRIVY_SEVERITY}
                ${process.env.DOCKER_USERNAME}/${process.env.DOCKER_REPO}:${process.env.SEMVER}
    `);
    log("scan success");
}

async function dockerSmokeTest(/** @type {string} */ outDir) {
    const testMediaDir = path.join(outDir, "media");
    const testMediaChildDir = path.join(testMediaDir, "test-dir");
    const container = `${process.env.DOCKER_USERNAME}-${process.env.DOCKER_REPO}-${process.env.SEMVER}-smoke-test`;
    let failed = false;
    let testCaseId = 0;

    ensureEmptyDir(outDir, testMediaDir, testMediaChildDir);

    fs.writeFileSync(path.join(testMediaChildDir, "test.mp3"), "", "utf-8");
    fs.writeFileSync(path.join(testMediaChildDir, "test.mp4"), "", "utf-8");
    fs.writeFileSync(path.join(testMediaChildDir, "test.srt"), "00:00:00,000 --> 00:00:01,000\ntest", "utf-8");
    fs.writeFileSync(path.join(testMediaChildDir, "test.sub"), "{0}{25}test", "utf-8");

    try {
        await startSmokeTestServer(container, testMediaDir);
        await runSmokeTestCase(++testCaseId, "/test-dir", 200, "/dir-index.js").catch(() => failed = true);
        await runSmokeTestCase(++testCaseId, "/test-dir/test.mp3", 200, "/media-player.js").catch(() => failed = true);
        await runSmokeTestCase(++testCaseId, "/test-dir/test.mp4", 200, "/media-player.js").catch(() => failed = true);
        await runSmokeTestCase(++testCaseId, "/test-dir/test.srt", 200, "WEBVTT").catch(() => failed = true);
        await runSmokeTestCase(++testCaseId, "/test-dir/test.sub", 200, "WEBVTT").catch(() => failed = true);
    } catch (_) {
        failed = true;
    } finally {
        exec(`docker container stop ${container}`, { stdio: "ignore", exitOnError: false });
    }

    try {
        await startSmokeTestServer(container, testMediaDir, "test.apps.googleusercontent.com", "test@gmail.com");
        await runSmokeTestCase(++testCaseId, "/test-dir", 401, "").catch(() => failed = true);
    } catch (_) {
        failed = true;
    } finally {
        exec(`docker container stop ${container}`, { stdio: "ignore", exitOnError: false });
    }

    if (failed) exit("smoke test failed");
    log("smoke success");
}
function startSmokeTestServer(container, testMediaDir, authClient = "", authEmails = "") {
    const port = 58081;
    exec(`docker container stop ${container}`, { stdio: "ignore", exitOnError: false });
    exec(`
        docker run --rm --detach
            --name ${container}
            --publish ${port}:58082
            --volume ${testMediaDir}:/home/node/media
            --env MEDIA_SHARE__AuthClient="${authClient}"
            --env MEDIA_SHARE__AuthEmails="${authEmails}"
        ${process.env.DOCKER_USERNAME}/${process.env.DOCKER_REPO}:${process.env.SEMVER}
    `);
    return checkUrl(`http://localhost:${port}/health`, { status: 200, body: "healthy", tries: 5, interval: 2 });
}
function runSmokeTestCase(testCaseId, url, status, body) {
    return checkUrl(`http://localhost:58081${url}`, { status, body }).catch(err => {
        const actual = JSON.parse(err);
        log(Error(JSON.stringify({
            testCaseId,
            url,
            expected: { status, body },
            actual: { status: actual.status, body: actual.body.replace(/\s+/g, " ").replace(/"/g, "'"), err: actual.err }
        })));
        throw err;
    });
}

async function checkUrl(
    /** @type {string} */ uri,
    /** @type {{ status?: number body?: string, tries?: number, interval?: number } | undefined} */ options
) {
    const url = new URL(uri);

    const isSuccess = ({ status, body }) => status === (options?.status ?? 200) && body?.includes(options?.body ?? "");

    const httpGet = () => new Promise(done => http.get(url.href, res => {
        let body = "";
        res.setEncoding("utf-8");
        res.on("data", chunk => body += chunk);
        res.on("error", err => done({ status: res.statusCode ?? -1, body, err }));
        res.on("end", () => done({ status: res.statusCode ?? -1, body }));
    }).on("error", err => done({ err })));

    const swapUrl = () => {
        switch (true) {
            case /^localhost$/i.test(url.hostname): url.hostname = "127.0.0.1"; return true;
            case url.hostname === "127.0.0.1": url.hostname = "localhost"; return true;
            default: return false;
        }
    };

    let req = undefined;
    for (let attempt = 1, tries = options?.tries ?? 1; attempt <= tries; attempt++) {
        log(`waiting for \x1b[33m${uri}\x1b[0m (attempt ${attempt}/${tries})`);

        req = await httpGet();
        if (!isSuccess(req) && swapUrl()) req = await httpGet();
        if (isSuccess(req)) return;

        await new Promise(ok => setTimeout(ok, (options?.interval ?? 1) * 1000));
    }

    return Promise.reject(JSON.stringify(req));
}

function results(/** @type {string} */ unitDir, /** @type {string} */ lintDir) {
    const errors = [];

    if (!fs.readdirSync(unitDir).find(f => f.endsWith(".xml"))) errors.push("unit test results not found");
    if (fs.existsSync(path.join(unitDir, ".fail"))) errors.push("unit test failed");
    if (fs.existsSync(path.join(lintDir, ".fail"))) errors.push("lint failed");

    if (errors.length) exit(errors.join("\n"));
    else log("results success");
}

function push() {
    if (!process.env.GITHUB_SHA || process.env.SEMVER === "0.0.0") exit("push can only run in CI");
    const tags = [process.env.SEMVER].concat(process.env.GITHUB_MAIN === "true" ? ["latest"] : [])
        .map(t => `--tag ${process.env.DOCKER_USERNAME}/${process.env.DOCKER_REPO}:${t}`);
    exec(`
        docker buildx build
            --pull
            --output type=registry
            ${tags.join(" ")}
            --build-arg SEMVER
            --platform linux/amd64,linux/arm64/v8
            .
    `);
    log("push success");
}

function exec(/** @type {string} */ cmd, /** @type {child_process.SpawnSyncOptions & { exitOnError: Boolean } | undefined} */ options) {
    try {
        const args = cmd.replace(/\s+/g, " ").split(" ").filter(x => !!x);
        if (args[0] === "npx" && process.platform === "win32") args[0] += ".cmd";
        log((options?.cwd ? `\x1b[90m[cwd: ${options.cwd}]\x1b[0m ` : "") + args.join(" "));
        const proc = child_process.spawnSync(args.shift(), args, {
            stdio: options?.stdio ?? "inherit",
            shell: false,
            cwd: options?.cwd ?? process.cwd(),
            ...(options?.env ? { env: { ...process.env, ...options.env } } : {})
        });
        if (proc.error) throw proc.error;
    } catch (err) {
        if (options?.exitOnError !== false) exit(err.message || err);
        if (!(options?.stdio === "ignore" || options?.stderr === "ignore")) log(err);
    }
}

function ensureEmptyDir(/** @type {string[]} */ ...dirs) {
    if (!dirs?.length || dirs.find(dir => !dir.trim())) exit(`invalid ensureEmptyDir args "${JSON.stringify({ dirs })}"`);
    dirs.forEach(dir => {
        if (fs.existsSync(dir)) fs.readdirSync(dir).forEach(item => fs.rmSync(path.join(dir, item), { recursive: true, force: true }));
        else fs.mkdirSync(dir, { recursive: true });
    });
}

function log(/** @type {Error | string} */ data) {
    if (data instanceof Error) console.error("\x1b[31m", data.message ?? data, "\x1b[0m");
    else console.log(data);
}

/** @returns {never} */
function exit(/** @type {Error | String | undefined} */ err) {
    log(err instanceof Error ? err : Error(err));
    process.exit(err ? 1 : 0);
}
