import * as GHFiles from "../models/GHFiles.mjs";
import * as DataStore from "../models/DataStore.mjs";

export async function clear_all(ctx, next) {
    const log = ctx.state.logger.get("clear_all");

    log.info("clear all");

    const cfg = ctx.state.config;

    await DataStore.cleanup_all(cfg.apiurl, true);
    await GHFiles.handleAllFiles();

    ctx.body = {message: "OK"};

    await next();
}
