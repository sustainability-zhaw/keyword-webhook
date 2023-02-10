import YAML from "yaml";
import fs from "fs/promises";
// const fs = require("node:fs/promises");

const defaults = {
    frontend: {
        port: 8080
    },
    authenticator: {
        port: 8081
    },
    backend: {}
};

export async function readConfig(locations) {
    let result = {};

    if ( typeof locations === "string" ) {
        locations = [locations];
    }

    const locs = await Promise.all(
        locations.map((afile) => fs.stat(afile)
            .then(() => afile)
            .catch(() => undefined))
    );

    const file = locs.filter((e) => e !== undefined).shift();

    if (file === undefined) {
        console.log(`${JSON.stringify({module: __filename, message: "No config files, return defaults"})}`);
        return defaults;
    }

    try {
        const cfgdata = await fs.readFile(file, "utf-8");

        if (cfgdata !== undefined) {
            result = YAML.parse(cfgdata);
        }
    }
    catch (err) {
        console.log(`${JSON.stringify({
            module: __filename,
            message: "cannot read file",
            extra: err.message})}`);
    }

    if (!result) {
        console.log(`${JSON.stringify({module: __filename, message: "Empty config, return defaults"})}`);
        result = defaults;
    }

    if (!result.frontend) {
        result.frontend = defaults.frontend;
    }
    else if (!result.frontend.port) {
        result.frontend.port = defaults.frontend.port;
    }

    if (!result.authenticator) {
        result.authenticator = defaults.authenticator;
    }
    else if (!result.authenticator.port) {
        result.authenticator.port = defaults.authenticator.port;
    }

    if (!result.backend) {
        result.backend = defaults.backend;
    }

    return result;
}
