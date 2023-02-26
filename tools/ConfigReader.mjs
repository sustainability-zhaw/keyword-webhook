import YAML from "yaml";
import fs from "fs/promises";
// const fs = require("node:fs/promises");

export async function readConfig(locations, keys, defaults) {
    let result = {};

    if (!(keys && Array.isArray(keys))) {
        keys = [];
    }

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

    result = keys.reduce((acc, k) => {
        if (!(k in acc)) {
            acc[k] = defaults[k];
        }
        
        return acc; 
    }, result)

    return result;
}
