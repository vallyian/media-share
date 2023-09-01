const fs = require("node:fs");
const path = require("node:path");
const child_process = require("node:child_process");
const checkUrl = require("./check-url");

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
        case "docker:start": return dockerStart(path.resolve(replaceEnv(process.argv[3])));
        case "docker:stop": return dockerStop();
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
        docker buildx build --pull
            --target export
            --output type=local,dest=${outDir}
        .
    `);

    exec(`
        docker buildx build --pull
            --tag ${process.env.DOCKER_USERNAME}/${process.env.DOCKER_REPO}:${process.env.SEMVER}
            --build-arg SEMVER
            --output type=docker
        .
    `);

    exec(`docker image inspect ${process.env.DOCKER_USERNAME}/${process.env.DOCKER_REPO}:${process.env.SEMVER}`, { stdio: "ignore" });

    log("build success");
}

function dockerStart(/** @type {string} */ mediaDir) {
    dockerStop();
    const isSecure = !!process.env.MEDIA_SHARE__CertCrt && !!process.env.MEDIA_SHARE__CertKey;
    exec(`
        docker run --rm --detach
            --name ${process.env.DOCKER_USERNAME}-${process.env.DOCKER_REPO}-${process.env.SEMVER}
            --publish 127.0.0.1:58081:58082
            --volume ${mediaDir}:/home/node/media
            ${isSecure ? "--volume " + process.env.MEDIA_SHARE__CertCrt + ":/run/secrets/cert.crt:ro" : ""}
            ${isSecure ? "--volume " + process.env.MEDIA_SHARE__CertKey + ":/run/secrets/cert.key:ro" : ""}
            --env MEDIA_SHARE__AuthClient
            --env MEDIA_SHARE__AuthEmails
            --env NODE_ENV=development
        ${process.env.DOCKER_USERNAME}/${process.env.DOCKER_REPO}:${process.env.SEMVER}
    `);
    return checkUrl(`${isSecure ? "https" : "http"}://localhost:58081/health`, 200, "healthy", 5, 2)
        .then(req => { log("media server started"); return req; });
}

function dockerStop() {
    exec(
        `docker container stop ${process.env.DOCKER_USERNAME}-${process.env.DOCKER_REPO}-${process.env.SEMVER}`,
        { stdio: "ignore", exitOnError: false }
    );
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
    ensureEmptyDir(outDir, testMediaDir, testMediaChildDir);

    fs.writeFileSync(path.join(testMediaChildDir, "test.mp3"), "", "utf-8");
    fs.writeFileSync(path.join(testMediaChildDir, "test.mp4"), "", "utf-8");
    fs.writeFileSync(path.join(testMediaChildDir, "test.srt"), "00:00:00,000 --> 00:00:01,000\ntest", "utf-8");
    fs.writeFileSync(path.join(testMediaChildDir, "test.sub"), "{0}{25}test", "utf-8");
    let failed = false;
    let testCaseId = 0;

    try {
        process.env.MEDIA_SHARE__AuthClient = "";
        process.env.MEDIA_SHARE__AuthEmails = "";
        await dockerStart(testMediaDir);
        await runSmokeTestCase(++testCaseId, "/test-dir", 200, "/dir-index.js").catch(() => failed = true);
        await runSmokeTestCase(++testCaseId, "/test-dir/test.mp3", 200, "/media-player.js").catch(() => failed = true);
        await runSmokeTestCase(++testCaseId, "/test-dir/test.mp4", 200, "/media-player.js").catch(() => failed = true);
        await runSmokeTestCase(++testCaseId, "/test-dir/test.srt", 200, "WEBVTT").catch(() => failed = true);
        await runSmokeTestCase(++testCaseId, "/test-dir/test.sub", 200, "WEBVTT").catch(() => failed = true);
    } catch (_) {
        failed = true;
    }

    try {
        process.env.MEDIA_SHARE__AuthClient = "test.apps.googleusercontent.com";
        process.env.MEDIA_SHARE__AuthEmails = "test@gmail.com";
        await dockerStart(testMediaDir);
        await runSmokeTestCase(++testCaseId, "/test-dir", 401, "").catch(() => failed = true);
    } catch (_) {
        failed = true;
    }

    dockerStop();
    if (failed) exit("smoke test failed");
    log("smoke success");
}

function runSmokeTestCase(testCaseId, url, status, body) {
    const isSecure = !!process.env.MEDIA_SHARE__CertCrt && !!process.env.MEDIA_SHARE__CertKey;
    return checkUrl(`${isSecure ? "https" : "http"}://localhost:58081${url}`, status, body).catch(req => {
        log(Error(JSON.stringify({
            testCaseId,
            url,
            expected: { status, body },
            actual: { ...req, body: req.body?.replace(/\s+/g, " ").replace(/"/g, "'") }
        })));
        throw err;
    });
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

function replaceEnv(/** @type {string} */ arg) {
    return arg.replace(/(\${([^}]+)})/g, e => process.env[e.replace(/(\${|})/g, "")]);
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
