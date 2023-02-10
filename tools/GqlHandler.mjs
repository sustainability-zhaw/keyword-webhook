
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
    const dropper = ["de", "en", "fr", "it"].map(lang => `
    deleteSdgMatch(filter: {construct: {regexp: "/^${regex}_${lang}/i"}}) {
        msg
    }`).join("");

    const query = `mutation { ${dropper} }`;
      
    const result = await runRequest(target, { query });
    
    if ("errors" in result) {
        console.log(`cleanup of ${regex} failed: ${JSON.stringify(result.errors, null, "  ")}`);
    }
}

async function runRequest(targetHost, bodyObject) {
    const method = "POST"; // all requests are POST requests
    const cache = "no-store";

    const headers = {
        'Content-Type': 'application/json'
    };

    const body = JSON.stringify(bodyObject, null, "  ");

    let result;
    let n = 0;

    while (n++ < 10 && (!result || ("errors" in  result && result.errors[0].message.endsWith("Please retry")))) {
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

        await new Promise((resolve) => setTimeout(() => resolve(), Math.floor(Math.random() * 10000)));
    }

    if (n === 10) {
        console.log("FATAL: Failed after 10 retries");
    }

    return result;
}
