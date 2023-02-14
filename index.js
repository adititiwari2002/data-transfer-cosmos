require("dotenv").config();
const { CosmosClient } = require("@azure/cosmos");

const key = process.env.COSMOS_KEY;
const endpoint = process.env.COSMOS_ENDPOINT;
const databaseId = process.env.DESTINATION_DB;
const containerId = process.env.DESTINATION_CONTAINER;
const partitionKeyPath = ["/company"];

const client = new CosmosClient({ endpoint, key });

const { readChangeFeed, getPartitionKeyRanges } = require("./changeFeed");

async function run() {
  const { database } = await client.databases.createIfNotExists({ id: databaseId });

  const { container } = await database.containers.createIfNotExists({
    id: containerId,
    partitionKey: {
      paths: [partitionKeyPath]
    }
  });

  const pkr = await getPartitionKeyRanges();

  for (pk in pkr) {
    let continuationToken = 1;
    let data = await readChangeFeed(pk, continuationToken);
    while (data.hasOwnProperty('count') && data.count > 0) {
      continuationToken = data.continuationToken;
      console.log("New Batch: ");
      for (const item of data.items) {
        try {
          await container.items.create(item);
        } catch (error) {
          console.log(error)
        }
      }
      data = await readChangeFeed(pk, continuationToken);
    }
  }
}

run().catch(console.error);
