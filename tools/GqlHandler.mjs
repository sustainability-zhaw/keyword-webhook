import {
    setTimeout,
} from "timers/promises";

export async function injectData(target, variables) {
    const query = `
    mutation addSdgMatch($matcher: [AddSdgMatchInput!]!) { 
        addSdgMatch(input: $matcher, upsert: true) { 
            sdgMatch {
                construct
            }
        } 
    }`;

    const result = await runRequest(target, { query, variables });

    if ("errors" in result) {
        console.log(`injecting data failed: ${JSON.stringify(result.errors, null, "  ")}`);
    }

    return result;
}

export async function cleanup_all(target, force) {
    if (!force) {
        return;
    }

    await Promise.all(Array(16).fill().map((_, id) => cleanup_selective(target, `sdg${id + 1}`)));
}

export async function cleanup_selective(target, regex) {
    // WORKAROUND due to dgraph NQUAD limitation
    // Fetch all matching objects for all matching terms
    // create batches of matching objects
    // clean up all matching objects one by one
    // clean all objects from


    const sdgNbr = regex.replace("sdg", "");

    const batchQuery = `query {
        query SDG_Matching_terms {
        matches: querySdg(filter: {and: [{has: objects}, {id: {eq: "sdg_${sdgNbr}}}]}) @cascade
        {
            objects {
                link
                sdg_matches(filter: {construct: {regexp: "/^sdg${sdgNbr}/i"}}) {
                    construct
                }
            }
        }
    }
    }`;

    const objects = await runRequest(target, { batchQuery });

    if ("errors" in objects) {
        console.log(`cleanup of ${regex} failed: ${JSON.stringify(objects.errors, null, "  ")}`);
    }

    let batch = objects.data.matches.objects;
    // for every maxBatchSize object, we drop the SDG AND the assigned index terms

    while (batch.length) {
        batch = await dropBatch(target, batch, sdgNbr);
    }

}

async function dropBatch(target, objects, sdg) {
    const maxBatchSize = 10;
    const retval = objects.slice(maxBatchSize);

    const batch = objects.slice(0, maxBatchSize);

    const links = batch.map((b) => b.link);
    const matches = batch.map((b) => b.sdg_matches.map((m) => m.construct)).flat();

    const patch = {
        "filter": {
            "link": {"in": links}
        },
        "remove": {
            "sdgs": [
                {"id": `sdg_${sdg}`}
            ],
            "sdg_matches": [
                { "construct": matches }
            ]
        }
    };

    const query = "mutation deleteMatches($patch: UpdateInfoObjectInput!) { updateInfoObject(input:$patch) { numUids } }";

    const result =  await runRequest(target, {query, variables: {patch}});

    if ("errors" in result) {
        console.log(`cleanup of ${sdg} failed: ${JSON.stringify(result.errors, null, "  ")}`);
    }

    return retval;
}

export async function check_sdg_terms(target) {
    const query = `query {
    sdg: querySdg
    {
        id
        matches: matchesAggregate {
            count
        }
    }
}`;

    const result = await runRequest(target, { query });

    if ("errors" in result) {
        console.log(`sdg match counting failed: ${JSON.stringify(result.errors, null, "  ")}`);
    }

    return result;
}

async function runRequest(targetHost, bodyObject) {
    const method = "POST"; // all requests are POST requests
    const cache = "no-store";

    const headers = {
        "Content-Type": "application/json"
    };

    const body = JSON.stringify(bodyObject, null, "  ");

    let result;
    let n = 0;

    while (n < 10 && (!result || "errors" in  result && result.errors[0].message.endsWith("Please retry"))) {
        n += 1;

        const RequestController = new AbortController();
        const {signal} = RequestController;

        const response = await fetch(targetHost, {
            signal,
            method,
            headers,
            cache,
            body
        });

        result = await response.json();

        await setTimeout(Math.floor(Math.random() * 10000));
    }

    if (n === 10) {
        console.log("FATAL: Failed after 10 retries");
    }

    return result;
}
