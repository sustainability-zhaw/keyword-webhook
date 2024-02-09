export async function check_push(ctx, next) {
    const log = ctx.state.logger.get("check_push");

    if (!("ref" in ctx.request.body)) {
        ctx.throw(200, "thank you");
    }

    log.info(`${ctx.request.body.head_commit.id}`);
    
    const branch = ctx.request.body.ref.replace("refs/heads/", "");

    if (branch !== ctx.state.config?.git?.branch) {
        log.info("push on other branch, ignored");
        ctx.throw(200, "thank you");
    }

    await next();
}
