import {Buffer} from "node:buffer";

// import { Octokit, App } from "octokit";

import * as Target from "./GqlHandler.mjs";
import * as Excel from "./Utilities.mjs";
import * as MQ from "./MQUtilities.mjs";

let octokit;

const setup = {};

export function init(config) {
    // octokit = new Octokit({
    //     auth: config.ghtoken
    // });

    setup.targetURL = config.apiurl;
    setup.target_path = config.target_path;
    setup.branch = config.branch;
}

export async function handleFiles(files, refid) {
    await Promise.all(files.map(handleOneFile));

    console.log(`${(new Date(Date.now())).toISOString()} -------- payload completed ${refid}`);
}

export async function handleAllFiles() {
    const files = sequence(16).map(i => `${setup.target_path}/SDG${i}.xlsx`);

    await handleFiles(files, "INIT");
}

async function handleOneFile(filename) {
    const sdgid = filename.split("/").pop().replace(".xlsx", "");

    console.log(`handle ${filename} for ${sdgid}`);

    let matcher; 

    try {
        matcher = await fetch(`https://github.com/sustainability-zhaw/keywords/raw/${setup.branch}/${filename}`)
                    .then((response) => response.arrayBuffer())
                    .then((contentBuffer) => Excel.loadOneBuffer(sdgid, contentBuffer));
    }
    catch (err) {
        console.log(`ERROR for ${sdgid}: ${err.message}`);
        return;
    }

    if (matcher.length) {
        await Target.cleanup_selective(setup.targetURL, sdgid.toLowerCase());
        await Target.injectData(setup.targetURL, {matcher});

        console.log(`incjected ${matcher.length} items for ${sdgid}`);

        const sdg = `${sdgid.toLowerCase().replace(/\d+/, "")}_${sdgid.toLowerCase().replace("sdg", "")}`;

        MQ.signal({sdg});
    }
}

function sequence(len, start) {
    if (!start) {
        start = 1;
    }
    return Array.from(Array(len), (_, i) => i + start);
}
