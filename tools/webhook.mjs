import {createHmac} from "node:crypto";

import Koa from "koa";
import Router from "@koa/router";
import KoaCompose from "koa-compose";
import koaBody from "koa-body";
import * as GHFiles from "./GHFiles.mjs";
import * as MQ from "./MQUtilities.mjs";

import * as Config from "./ConfigReader.mjs";

const cfg = await Config.readConfig(["/etc/app/config.json", "./config.json", "./tools/config.json"], [], {});

GHFiles.init(cfg);
await MQ.init(cfg);

const hook = setup();

if ( cfg.relax?.toLowerCase() !== "yes" ) {
    // inject any existing data
    console.log("inject all sdg files");
    GHFiles.handleAllFiles();
}

console.log("start webhook api");
hook.run();

function setup() {
    console.log("setup webhook api");

    const app = new Koa();
    const router = new Router();

    // app.use(koaBody.koaBody());

    router.post("/payload", koaBody.koaBody(), KoaCompose([
        startRequest,
        verifyRequest,
        handlePing,
        checkPush,
        checkFiles,
        handlePayload,
        handleOther,
        cleanup
    ])); 

    router.get("/", KoaCompose([
        startRequest,
        handleHelo
    ])); 

    app.use(router.routes());

    console.log(`use port ${cfg.port}`);

    return {run: () => app.listen(cfg.port || 8090)};
}

async function startRequest(ctx, next) {
    console.log(`${(new Date(Date.now())).toISOString()} -------- new request ${ctx.request.body ? "with payload": ""}`);
    await next();
}

async function verifyRequest(ctx, next) {
    const secret = cfg.ghsecret;

    if (secret && secret.length) {
        const secSha = ctx.request.header["x-hub-signature-256"];
        if (!(secSha && secSha.length)) {
            console.log("no signature found");

            ctx.status = 405;
            ctx.body = JSON.stringify({message: "sorry"});
        }
        else {
            // verify signature 
            const sigHashAlg = 'sha256';

            const verify = `${sigHashAlg}=${
              createHmac(sigHashAlg, cfg.ghsecret)
                .update(JSON.stringify(ctx.request.body))
                .digest("hex")}`;

            if (verify !== secSha) {
                console.log("signature doesn't match");

                ctx.status = 405;
                ctx.body = JSON.stringify({message: "sorry"});
            }
            else {            
                console.log("signature is ok");
            }
        }
    }

    await next();
}

async function handlePing(ctx, next) {
    if (!ctx.body && "zen" in ctx.request.body) {
        console.log("   GH ping");
        ctx.body = JSON.stringify({message: "Not being distracted at all."});
    }
    await next();
}

async function handleOther(ctx, next) {
    if (!ctx.body && !("ref" in ctx.request.body)) {
        console.log(JSON.stringify(ctx.request.body, null, "  "));
        ctx.body = JSON.stringify({message: "thank you"});
    }
    await next();
}

async function checkPush(ctx, next) {
    if (!ctx.body && "ref" in ctx.request.body) {
        console.log(`${(new Date(Date.now())).toISOString()} -- ${ctx.request.body.head_commit.id}`);
        
        const branch = ctx.request.body.ref.replace("refs/heads/", "");

        if (branch !== cfg.branch) {
            console.log("push on other branch, ignored");
            ctx.body = JSON.stringify({message: "thank you"});
        }
    }
    await next();
}

async function checkFiles(ctx, next) {
    if (!ctx.body && "ref" in ctx.request.body) {
        const files = ctx.request.body.commits
                    // merge all available files that have changed.
                    .map((c) => c.modified.concat(c.added)).flat()
                    // focus on target path
                    .filter(fn => fn.startsWith(cfg.target_path))
                    // filter target files
                    .filter((fn) => fn.slice(-5) === ".xlsx")
                    // remove duplicates
                    .reduce((agg, fn) => {
                        if (!agg.includes(fn)) {
                            agg.push(fn);
                        }
                        return agg;
                    }, []);
  
        if (!files.length) {
            console.log("no relevant files have changed");
            ctx.body = JSON.stringify({message: "done"});
        }

        ctx.gh_files = files;
    } 

    await next();
}

async function handlePayload(ctx, next) {
    if (!ctx.body && ctx.gh_files) {
        console.log(`some files have changed: ${ctx.gh_files.join("; ")}`);

        ctx.body = JSON.stringify({message: "accepted"});

        GHFiles.handleFiles(ctx.gh_files, ctx.request.body.head_commit.id);
    }
    
    await next();
}

async function cleanup(ctx, next) {
    if (!ctx.body) {
        ctx.body = JSON.stringify({message: "nothing to do"});
    }

    console.log(`${(new Date(Date.now())).toISOString()} -------- request done`);

    await next();
}

async function handleHelo(ctx, next) {
    console.log("HELO");

    ctx.body = JSON.stringify({message: "Hello"});

    await next();
}
