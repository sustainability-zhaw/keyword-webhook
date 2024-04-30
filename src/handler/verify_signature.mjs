import {createHmac} from "node:crypto";

export async function verify_signature(ctx, next) {
    const log = ctx.state.logger.get("verify_signature");
    const secret = ctx.state?.config?.ghsecret;
    const cfg = ctx.state.config;

    if (!(secret && secret.length)) {
        log.warn("no secret found");
        ctx.throw(405, "sorry");
    }

    const secSha = ctx.request.header["x-hub-signature-256"];

    if (!(secSha && secSha.length)) {
        log.warn("no signature found");
        ctx.throw(405, "sorry");
    }

    // verify signature
    const sigHashAlg = "sha256";

    const verify = `${sigHashAlg}=${
        createHmac(sigHashAlg, cfg.ghsecret)
            .update(JSON.stringify(ctx.request.body))
            .digest("hex")
    }`;

    if (verify !== secSha) {
        log.warn("signature doesn't match");
        ctx.throw(405, "sorry");
    }

    log.info("signature is ok");

    await next();
}
