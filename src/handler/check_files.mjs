export async function check_files(ctx, next) {
    const log = ctx.state.logger.get("check_files");
    const cfg = ctx.state.config;

    
    if (!("commits" in ctx.request.body)) {
        log.info("no commits in push");
        ctx.throw(200, "done");
    }

    const files = ctx.request.body.commits
                // merge all available files that have changed.
                .map((c) => c.modified.concat(c.added)).flat()
                // focus on target path
                .filter(fn => fn.startsWith(cfg.git.target_path))
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
        log.info("no relevant files have changed");
        ctx.throw(200, "done");
    }

    log.debug(`files changed: ${files.join("; ")}`);
    ctx.gh_files = files;
 
    await next();
}
