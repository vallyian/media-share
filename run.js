const fs = require("fs");
const path = require("path");
const child_process = require("child_process");
const http = require("http");

const docker_username = process.env["DOCKER_USERNAME"] || "vallyian";
const docker_repo = process.env["DOCKER_REPO"] || "media-share";
const github_main = process.env["GITHUB_MAIN"] || "false";
const new_version = process.env["NEW_VERSION"] || "";
const github_sha = process.env["GITHUB_SHA"] || "";
const semver = process.env["SEMVER"] || "0.0.0";
const npm_audit_level = process.env["NPM_AUDIT_LEVEL"] || "low";
const trivy_severity = process.env["TRIVY_SEVERITY"] || "UNKNOWN,LOW,MEDIUM,HIGH,CRITICAL";
const artifacts_dir = path.normalize(`${process.cwd()}/artifacts`);
const home = process.env["USERPROFILE"] || process.env["HOME"];

(async () => {
    switch (process.argv[2]) {
        case "semver": return gh_semver();
        case "build": return await build();
        case "smoke": return await smoke();
        case "scan": return scan();
        case "results": return results();
        case "push": return gh_push();
        case "ci": return await ci();

        default: return term("USAGE:   ./run   semver | build | smoke | results | scan | push | ci");
    }
})();

function gh_semver() {
    if (new_version === "") term("semver can only run in CI");

    if (github_main === "true") {
        console.log(`::set-output name=SEMVER::${new_version}`);
        console.log(`SEMVER: ${new_version}`);
    } else {
        console.log(`::set-output name=SEMVER::${new_version}-${github_sha}`);
        console.log(`SEMVER: ${new_version}-${github_sha}`);
    }
}

async function build() {
    fs.rmSync("artifacts", { recursive: true, force: true });

    child_process.execSync([
        `docker buildx build --output="type=local,dest=${artifacts_dir}" --target="export"`,
        github_sha === "" ? "" : "--pull",
        `--build-arg="NPM_AUDIT_LEVEL=${npm_audit_level}"`,
        "."
    ].join(" "), { stdio: "inherit" });

    child_process.execSync([
        `docker buildx build --output="type=docker"`,
        github_sha === "" ? "" : "--pull",
        `--tag="${docker_username}/${docker_repo}:${semver}"`,
        `--build-arg="SEMVER=${semver}"`,
        "."
    ].join(" "), { stdio: "inherit" });

    await new Promise((ok, reject) => child_process.exec(`docker image inspect ${docker_username}/${docker_repo}:${semver}`,
        (err, _, stderr) => {
            if (err || stderr) {
                console.log(stderr ? stderr : err);
                reject();
            }
            ok();
        }));

    console.log("build success");
}

async function smoke() {
    const container = `${docker_username}-${docker_repo}-${semver}-smoke-test`;
    const smoke_test_dir = path.join(artifacts_dir, "smoke-test");
    const media_dir = path.join(smoke_test_dir, "media");
    const media_test_dir = path.join(media_dir, "test-dir");
    const errors = [];
    let test_id = 0;
    let server;
    const request = url => new Promise((ok, reject) => http.get(url, res => {
        let body = "";
        res.setEncoding('utf8');
        res.on("data", chunk => body += chunk);
        res.on("error", err => ok({ status: res.statusCode, body, err }));
        res.on("end", () => ok({ status: res.statusCode, body }));
    }).on("error", err => reject(err))
    ).catch(ex => ({ ex }));
    const stop_server = () => new Promise(done => {
        try { child_process.execSync(`docker stop ${container}`, { stdio: "ignore" }); } catch (_) { }
        try { child_process.execSync(`docker rm ${container}`, { stdio: "ignore" }); } catch (_) { }
        if (!server) return done();
        try { server.kill(); } catch (_) { return done(); }
        const wait = () => setTimeout(() => server ? wait() : done(), 100);
        wait();
    });
    const start_server = async (authClient = "", authEmails = "") => {
        await stop_server();
        server = child_process.exec([
            `docker run --name ${container}`,
            `-p="58081:58082"`,
            `-v="${media_dir}:/home/node/media"`,
            `-e="MEDIA_SHARE__AuthClient=${authClient}"`,
            `-e="MEDIA_SHARE__AuthEmails=${authEmails}"`,
            `${docker_username}/${docker_repo}:${semver}`
        ].join(" "), (err, stdout, stderr) => console.log({ start_server: { err, stdout, stderr } }))
            .on("message", message => console.log({ start_server: { message } }))
            .on("error", err => console.error({ start_server: { err } }))
            .on("exit", exit => {
                console.log({ start_server: { exit } });
                server = null;
            });

        const req = () => new Promise(ok => setTimeout(() => ok(request("http://localhost:58081/health").then(res => {
            if (res.body !== "healthy") {
                console.error({ res });
                return req();
            }
        })), 1000));
        return Promise.race([
            req(),
            new Promise((_, reject) => setTimeout(() => reject("timeout waiting for health endpoint"), 30000))
        ]).then(() => true).catch(err => {
            console.error({ start_server: { err } });
            errors.push(JSON.stringify({ start_server: { authClient, authEmails } }));
            return false;
        });
    };
    const run_test = (url, status, body) => {
        test_id++;
        return request(`http://localhost:58081${url}`, `${smoke_test_dir}/curl-${test_id}.txt`)
            .then(res => {
                if (res.status !== status || !res.body.includes(body)) {
                    console.error(res);
                    throw res;
                }
            })
            .catch(ex => {
                console.error({ test_id, url, expected: { status, body }, actual: { ex } });
                errors.push({ test_id, url, expected: { status, body }, actual: { ex } });
            })
    };

    fs.rmSync(smoke_test_dir, { recursive: true, force: true });
    fs.mkdirSync(media_test_dir, { recursive: true });
    fs.writeFileSync(path.join(media_test_dir, "test.mp3"), "", "utf-8");
    fs.writeFileSync(path.join(media_test_dir, "test.mp4"), "", "utf-8");
    fs.writeFileSync(path.join(media_test_dir, "test.srt"), "00:00:00,000 --> 00:00:01,000\ntest", "utf-8");
    fs.writeFileSync(path.join(media_test_dir, "test.sub"), "{0}{25}test", "utf-8");

    if (await start_server()) {
        await run_test("/test-dir", 200, "/dir-index.js");
        await run_test("/test-dir/test.mp3", 200, "/media-player.js");
        await run_test("/test-dir/test.mp4", 200, "/media-player.js");
        await run_test("/test-dir/test.srt", 200, "WEBVTT");
        await run_test("/test-dir/test.sub", 200, "WEBVTT");
    }

    if (await start_server("test.apps.googleusercontent.com", "test@gmail.com")) {
        await run_test("/test-dir", 401, "");
    }

    await stop_server();

    if (errors.length) term(`smoke test failed: ${JSON.stringify(errors)}`);
    console.log("smoke success");
}

function scan() {
    child_process.execSync([
        `docker run --rm --pull="always"`,
        `-v="/var/run/docker.sock:/var/run/docker.sock"`,
        `-v="${home}/.trivy/cache:/root/.cache"`,
        `aquasec/trivy`,
        `image`,
        `--exit-code=1`,
        `--severity="${trivy_severity}"`,
        `${docker_username}/${docker_repo}:${semver}`
    ].join(" "), { stdio: "inherit" });

    console.log("scan success");
}

function results() {
    const errors = [];

    if (fs.existsSync(path.normalize(`${artifacts_dir}/npm-test.fail`))) errors.push("npm test failed");
    if (fs.existsSync(path.normalize(`${artifacts_dir}/npm-lint.fail`))) errors.push("npm lint failed");
    if (!fs.readdirSync(path.normalize(`${artifacts_dir}/unit-tests`)).find(f => f.endsWith(".xml"))) errors.push("npm test results not found");

    if (errors.length) term(errors.join("\n"));
    console.log("results success");
}

function gh_push() {
    if (semver === "0.0.0") term("push can only run in CI");

    child_process.execSync([
        `docker buildx build --pull --output="type=registry"`,
        github_main === "true" ? `--tag="${docker_username}/${docker_repo}:latest"` : "",
        `--tag="${docker_username}/${docker_repo}:${semver}"`,
        `--build-arg="SEMVER=${semver}"`,
        `--platform="linux/amd64,linux/arm64/v8"`,
        `.`
    ].join(" "), { stdio: "inherit" });

    console.log("gh_push success");
}

async function ci() {
    await build();
    await smoke();
    scan();
    results();
    console.log("ci success");
}

function term(err) { console.error(`\x1b[31m${err}\x1b[0m`); process.exit(1); }
