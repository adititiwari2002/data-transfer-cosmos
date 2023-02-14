# data-transfer-cosmos
Transfer data from source to destination container

Steps:
1. Clone this repository ``` git clone https://github.com/adititiwari2002/data-transfer-cosmos.git ```
2. Cd into it and run ``` npm i ```
3. Create a .env file and fill the configs:
    1. DB_ACCOUNT = 
    2. SOURCE_DB = 
    3. SOURCE_CONTAINER = 
    4. DESTINATION_DB = 
    5. DESTINATION_CONTAINER = 
    6. MAX_ITEM_COUNT = 
    7. COSMOS_ENDPOINT = 
    8. COSMOS_KEY = 


## For inter account data transfer (the source and destination db are under different cosmos db resource)
Add COSMOS_DESTINATION_ENDPOINT and COSMOS_DESTINATION_KEY inside the .env file and use these values inside the index.js files
