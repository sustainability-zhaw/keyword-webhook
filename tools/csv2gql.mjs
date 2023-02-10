import * as CSVParser from "csv-parse";
import fs from "fs";
import { finished } from "stream/promises";

import * as Expander from "./Utilities.mjs";
import * as Target from "./GqlHandler.mjs";

let argHost = process.argv.pop();

if (process.argv.length < 2 && argHost.slice(0,3) !== "http") {
    argHost = null;
}

// The default target is localhost to match the dev environment
const targetHost = argHost? argHost : "http://localhost:8080/api/";

const forceClean = process.env.CLEANUP;

// const parentdir = "data/sdgs_originals/with_posterior";
const parentdir = "data/arch/sdgs";

const files = [1,2,3,4,5,6,7,8,9,10,11,12,13,14,15,16];

const matchTerms = await Promise.all(files.map(loadOneFile));

const fresults = await Promise.all(matchTerms.map(matcher => Target.injectData(targetHost, {matcher})));

console.log(JSON.stringify(fresults, null, "  "));

/* ************** SUPPORT FUNCTIONS ************************* */

async function loadTable(sdgid) {
    const parser = CSVParser.parse({
        delimiter: ";"
    });

    const data = [];

    parser.on("readable", () => {
        let r;
        while ((r = parser.read()) !== null) {
            data.push(r);
        }
    });

    fs.createReadStream(`${parentdir}/${sdgid}.csv`)
    .pipe(parser);

    await finished(parser);

    return data;
}

async function loadOneFile(idx) {
    const fileid = `SDG${idx}`;
    const data = await loadTable(fileid);
    const constructs = [];
    
    const fields = data.shift();
    const headings = fields.map(f => {
        if (f === "id") {
            return {
                key: f
            };
        }

        return { 
            language: f.slice(-2),
            key: f.slice(0,-3)
        };
    });

    // Not implemented as a reducer to be inline with the excel tool
    data.forEach((record, rid) => {
        const id = `${fileid.toLowerCase()}_${record[0].trim()}`;

        const obj = {
            id: `${sdg.toLowerCase()}_c${rid}`
        };


        record.forEach((cell, cid) => {
            if (!cell.length) {
                return;
            }

            if (!(headings[cid].lang in obj)) {
                obj[headings[cid].lang] = {
                    construct: `${obj.id}_${headings[cid].lang}`,
                    language: headings[cid].lang,
                    sdg: {
                        id: `sdg_${id}`
                    }
                };
            }

            obj[headings[cid].lang][headings[cid].key] = cell.replaceAll("*", " ").trim();
        });

        ["en", "de", "fr", "it"].forEach(l => {
            if (l in obj) {
                constructs.push(obj[l]);
            }
        });
    });

    return Expander.expand(constructs);
}
