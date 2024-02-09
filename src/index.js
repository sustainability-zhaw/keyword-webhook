import * as service from "@phish108/web-service-core";

import * as GHFiles from "./models/GHFiles.mjs";
import * as DataStore from "./models/DataStore.mjs";

import * as ServiceHandler from "./handler"

import * as defaults from "./defaults.json" with { type: "json" };

const app = await service.init(defaults, ServiceHandler);

const log = app.logger.get("keywords");

GHFiles.init(app);
DataStore.init(app);

// verify that the system is not in an uninitialized state.
const isRelax = app.config.relax?.toLowerCase() === "yes";
const isInitialised = await DataStore.checkSdgTerms();

if (!isInitialised || !isRelax) {
    log.info("inject all sdg matching terms");
    GHFiles.handleAllFiles();
}

app.run();
