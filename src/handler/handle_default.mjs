export async function handle_default(ctx, next) {
    const log = ctx.state.logger.get("handle_default");
    
    if (!ctx.body) {
        log.info("default handler");
        ctx.body = {message: "OK"};
    }

    await next();
}
