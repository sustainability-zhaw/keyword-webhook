import Excel from "exceljs";

export function loadOneFile(parentdir) {
    return async function loader(id) {
        const sdg = `SDG${id}`;
        const worksheet = await readWorkbook(parentdir, sdg);

        return handleRows(worksheet, sdg);
    };
}

export async function loadOneBuffer(sdg, buffer) {
    const worksheet = await loadWorkbook(sdg, buffer);

    return handleRows(worksheet, sdg);
}

export function expand(construct) {
    return expandConstruct(construct, "required_context").map(o => expandConstruct(o, "forbidden_context")).flat();
}

function expandConstruct(obj, type) {
    if (!obj) {
        return [];
    }

    if (Array.isArray(obj)) {
        return obj.map((o)=> expandConstruct(o, type)).flat();
    }

    if (!(type in obj)) {
        return [obj];
    }

    const result = [];

    obj[type]
        .split(",") // problem when commas appear in quotes
        .map(t => t.trim().replace(/^["']\s*/, "\"").replace(/\s*["']$/, ""))
        .filter(t => t.length)
        .reduce((res, t, i) => {
            const tmpObj = Object.assign({}, obj);

            i += 1;

            tmpObj.construct = `${tmpObj.construct}_${i}`;
            tmpObj[type] = t;
            res.push(tmpObj);
            return res;
        }, result);

    return result;
}

async function readWorkbook(parentdir, sdgid) {
    const workbook = new Excel.Workbook();

    await workbook.xlsx.readFile(`${parentdir}/${sdgid}.xlsx`);

    return workbook.getWorksheet(sdgid);
}

async function loadWorkbook(sdgid, buffer) {
    const workbook = new Excel.Workbook();

    await workbook.xlsx.load(buffer);

    return workbook.getWorksheet(sdgid);
}


function loadHeadings(worksheet) {
    const headings = [];

    worksheet.getRow(1).eachCell((cell) => headings.push({
        lang: cell.value.slice(-2),
        key: cell.value.slice(0, -3)
    }));

    return headings;
}

function handleRows(ws, sdg) {
    if (!ws) {
        return [];
    }
    const constructs = [];
    const headings = loadHeadings(ws);

    const id = sdg.replace("SDG", "");

    const now = new Date(Date.now()).toISOString();

    ws.eachRow((row,rid) => {
        if (rid === 1) {
            return;
        }

        const obj = {
            id: `${sdg.toLowerCase()}`
        };

        row.eachCell((cell, cid) => {
            if (!cell.value.length) {
                return;
            }

            cid -= 1;

            if (!(headings[cid].lang in obj)) {
                obj[headings[cid].lang] = {
                    construct: `${obj.id}_${headings[cid].lang}_c${rid}`,
                    language: headings[cid].lang,
                    sdg: {
                        id: `sdg_${id}`
                    },
                    dateUpdate: now
                };
            }

            obj[headings[cid].lang][headings[cid].key] = cell.value.replaceAll("*", " ").trim();
        });

        ["en", "de", "fr", "it"].forEach(l => {
            if (l in obj) {
                constructs.push(obj[l]);
            }
        });
    });

    return expand(constructs);
}
