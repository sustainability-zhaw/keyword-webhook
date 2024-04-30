import * as GHFiles from "../models/GHFiles.mjs";

export async function handlePayload(ctx, next) {
    const log = ctx.state.logger.get("handle_payload");

    log.info(`some files have changed: ${ctx.gh_files.join("; ")}`);

    GHFiles.handleFiles(ctx.gh_files, ctx.request.body.head_commit.id);

    ctx.body = {message: "accepted"};

    await next();
}
