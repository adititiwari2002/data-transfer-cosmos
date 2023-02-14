const config = {}

config.axiosDefaultTimeoutInMilliseconds = process.env.AXIOS_DEFAULT_TIMEOUT_IN_MILLISECONDS || 60000
config.cosmosdbApiTimeoutSec = parseInt(process.env.COSMOSDB_API_TIMEOUT_SEC) || 30;
config.cosmosdbApiMaxSockets = parseInt(process.env.COSMOSDB_API_MAX_SOCKETS) || 100;
config.cosmosdbApiMaxFreeSockets = parseInt(process.env.COSMOSDB_API_MAX_FREE_SOCKETS) || 100;
config.cosmosdbApiVersion = process.env.COMOSDB_API_VERSION || "2018-12-31"
config.changefeedThresholdRetryCount = parseInt(process.env.CHANGEFEED_THRESHOLD_RETRY_COUNT) || 3;
config.primaryKey = process.env.COSMOS_KEY

module.exports = {config};