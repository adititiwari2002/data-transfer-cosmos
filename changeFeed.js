/* tslint:disable:typedef */
require("dotenv").config();
const config = require("./config");
const crypto = require("crypto");
const https = require("https");

const agent = new https.Agent({
    maxSockets: config.cosmosdbApiMaxSockets,
    maxFreeSockets: config.cosmosdbApiMaxFreeSockets,
    timeout: config.cosmosdbApiTimeoutSec * 1000,
    keepAlive: true
});

const commonChangefeedHeaders = {
    'x-ms-version': '2018-12-31',
    "content-type": "application/json",
}

function getAuthorizationTokenUsingMasterKeyForChangeFeed(resourceType, resourceId, date) {
    const verb = 'get'
    const masterKey = process.env.COSMOS_KEY;
    const key = Buffer.from(masterKey, "base64");
    const text = (verb || "").toLowerCase() + "\n" +
        (resourceType || "").toLowerCase() + "\n" +
        (resourceId || "") + "\n" +
        date.toLowerCase() + "\n" +
        "" + "\n";

    const body = Buffer.from(text, "utf8");
    const signature = crypto.createHmac("sha256", key).update(body).digest("base64");
    const MasterToken = "master";

    const TokenVersion = "1.0";
    return encodeURIComponent("type=" + MasterToken + "&ver=" + TokenVersion + "&sig=" + signature);
}

async function getResponse(apiOptions) {
    const url = apiOptions.url;
    const headers = apiOptions.headers;
    const response = await fetch(url, { headers })
    if (response.ok) {
        const data = await response.json();
        return data;
    } else {
        return undefined;
    }
}

async function getChangeFeedOrPartitionRanges(url, resourceId, headers, isChangeFeedQuery) {
    if (isChangeFeedQuery) {
        headers = {
            'A-IM': 'Incremental feed',
            ...headers
        }
    }
    let absoluteUrl = "https://" + process.env.DB_ACCOUNT + ".documents.azure.com/" + url;
    let date = (new Date()).toUTCString();
    const apiOptions = {
        method: "GET",
        url: absoluteUrl,
        headers: {
            ...commonChangefeedHeaders,
            'x-ms-throttle-retry-count': 9,
            "Authorization": getAuthorizationTokenUsingMasterKeyForChangeFeed((isChangeFeedQuery ? 'docs' : 'pkranges'), resourceId, date),
            'x-ms-date': date,
            ...headers
        },
        agent
    };
    const response = await getResponse(apiOptions);

    return response;
}

const databaseUrl = `dbs/${process.env.SOURCE_DB}`;
const containerUrl = `${databaseUrl}/colls/${process.env.SOURCE_CONTAINER}`;

async function getChangeFeed(contToken) {
    return getChangeFeedPrivate(contToken, containerUrl, null);
}

function getChangeFeedPrivate(contToken, collectionUrl, partitionKey) {
    const headers = {
        'x-ms-max-item-count': parseInt(process.env.MAX_ITEM_COUNT),
    };
    if (partitionKey) {
        headers['x-ms-documentdb-partitionkey'] = partitionKey;
    }
    if (contToken) {
        headers['If-None-Match'] = contToken;
    }
    const resourceId = collectionUrl;
    const url = resourceId + "/docs";
    return new Promise(async (resolve, reject) => {
        try {
            const queryResponse = await getChangeFeedOrPartitionRanges(url, resourceId, headers, true);
            if (typeof queryResponse === "undefined") {
                resolve({
                    continuationToken: "1",
                    count: 0,
                });
            } else {
                const numDocuments = queryResponse._count
                resolve({
                    items: queryResponse.Documents,
                    continuationToken: queryResponse.Documents[numDocuments - 1]._lsn.toString(),
                    count: numDocuments,
                });
            }
        }
        catch (error) {
            reject(error);
        }
    });
}

async function getPartitionKeyRanges() {
    const headers = {};
    const resourceId = getResourceIdFromCollectionName();
    const url = resourceId + "/pkranges";
    return new Promise(async (resolve, reject) => {
        try {
            const queryResponse = await getChangeFeedOrPartitionRanges(url, resourceId, headers, false);
            const filteredRanges = discardGoneRanges(queryResponse.PartitionKeyRanges)
            resolve(filteredRanges);
        }
        catch (error) {
            reject(error);
        }
    });
}

function discardGoneRanges(ranges) {
    // A split may complete between the readPartitionKeyRanges query page responses.
    // We need to discard the old parent ranges which are replaced with new children
    // ranges in the later pages.
    const parentIds = {};
    ranges.forEach(range => {
        if (range.Parents !== undefined && range.Parents != null && Array.isArray(range.Parents)) {
            range.Parents.forEach(parentId => { parentIds[parentId] = true; });
        }
    });
    const filteredRanges = ranges.filter(range => !(range.Id in parentIds));
    return filteredRanges;
}

function getResourceIdFromCollectionName() {
    return containerUrl;
}

async function readChangeFeed(partitionKeyRangeId, continuationToken) {
    const headers = {
        'x-ms-max-item-count': parseInt(process.env.MAX_ITEM_COUNT),
        'x-ms-documentdb-partitionkeyrangeid': partitionKeyRangeId
    };
    if (continuationToken) {
        headers['If-None-Match'] = continuationToken;
    }
    const resourceId = getResourceIdFromCollectionName();
    const url = resourceId + "/docs";
    return new Promise(async (resolve, reject) => {
        try {
            const queryResponse = await getChangeFeedOrPartitionRanges(url, resourceId, headers, true);
            if (typeof queryResponse === "undefined") {
                resolve({
                    continuationToken: "1",
                    count: 0,
                });
            } else {
                const numDocuments = queryResponse._count
                resolve({
                    items: queryResponse.Documents,
                    continuationToken: queryResponse.Documents[numDocuments - 1]._lsn.toString(),
                    count: numDocuments,
                });
            }
        }
        catch (error) {
            reject(error);
        }
    });
}

module.exports = {
    getChangeFeed,
    readChangeFeed,
    getPartitionKeyRanges
};