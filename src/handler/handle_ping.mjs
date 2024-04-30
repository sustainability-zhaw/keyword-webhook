export async function handle_ping(ctx, next) {
    const log = ctx.state.logger.get("handle_ping");

    if ("zen" in ctx.request.body) {
        log.info("GH ping");
        ctx.throw(200, "Not being distracted at all.");
    }

    await next();
}
