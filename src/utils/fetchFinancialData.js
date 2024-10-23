const axios = require('axios');
const { getRedisClient } = require('../services/redisClient');
const prepareData = require('./dataPreparation');
const config = require('../config/config');
const isMarketOpen = require('./marketStatus');
const { fetchOptionsChain, fetchExpectedMove, fetchSPYLastPrice } = require('./fetchDataHelper');
const { performance } = require('perf_hooks');

const fetchFinancialData = async () => {
    const fetchAndProcessData = async () => {
        try {
            const startTime = performance.now();

            console.log('Checking if market is open...');
            const marketOpen = await isMarketOpen();
            if (!marketOpen) {
                console.log('Market is closed. Skipping data fetch.');
                // Schedule the next check after a delay when market is closed
                setTimeout(fetchAndProcessData, config.retrieveInterval);
                return;
            }

            console.log('Fetching financial data...');
            const fetchStartTime = performance.now();
            const [optionsChainData, spyLastPrice, expectedMoveData] = await Promise.all([
                fetchOptionsChain(config.ticker),
                fetchSPYLastPrice(),
                fetchExpectedMove(config.ticker)
            ]);
            const fetchEndTime = performance.now();
            console.log(`Data fetching took ${fetchEndTime - fetchStartTime} ms`);

            console.log('Preparing data...');
            const prepareStartTime = performance.now();
            const data = await prepareData(optionsChainData);
            const prepareEndTime = performance.now();
            console.log(`Data preparation took ${prepareEndTime - prepareStartTime} ms`);

            console.log('Combining data...');
            const combineStartTime = performance.now();
            const combinedData = {
                Options: data || {},
                Price: spyLastPrice.Last,
                ExpectedMove: expectedMoveData.expectedMove
            };
            const combineEndTime = performance.now();
            console.log(`Data combination took ${combineEndTime - combineStartTime} ms`);

            const timestamp = optionsChainData.updated[0];

            if (!config.skipRedisCheck) {
                console.log('Checking if data has changed...');
                const redisClient = await getRedisClient();
                let lastEntry;
                try {
                    lastEntry = await redisClient.zRange('options_chain_data_zset', -1, -1);
                    console.log('Last entry retrieved:', lastEntry);
                } catch (redisError) {
                    console.error('Error fetching last entry from Redis:', redisError);
                    lastEntry = [];
                }
                
                if (lastEntry.length > 0) {
                    const lastData = JSON.parse(lastEntry[0]);
                    if (lastData.Options.Updated === combinedData.Options.Updated) {
                        console.log('Data has not changed. Waiting for 1 minute before trying again.');
                        setTimeout(fetchAndProcessData, 60000);
                        return;
                    }
                }
            } else {
                console.log('Skipping Redis check as per configuration.');
            }

            console.log('Storing data in Redis...');
            const redisStartTime = performance.now();
            try {
                await redisClient.zAdd('options_chain_data_zset', {
                    score: timestamp,
                    value: JSON.stringify(combinedData),
                });
            } catch (redisError) {
                console.error('Error adding data to Redis:', redisError);
                throw redisError;  // Re-throw to be caught by the outer catch block
            }
            const redisEndTime = performance.now();
            console.log(`Redis storage took ${redisEndTime - redisStartTime} ms`);

            // Publish update notification
            console.log('Publishing update notification...');
            await redisClient.publish('options_chain_update', 'update');

            console.log('Managing Redis entries...');
            const maxEntries = config.redisMaxEntries;
            let totalEntries;
            try {
                totalEntries = await redisClient.zCard('options_chain_data_zset');
            } catch (redisError) {
                console.error('Error getting total entries from Redis:', redisError);
                totalEntries = 0;
            }
            if (totalEntries > maxEntries) {
                try {
                    await redisClient.zRemRangeByRank('options_chain_data_zset', 0, totalEntries - maxEntries - 1);
                } catch (redisError) {
                    console.error('Error removing excess entries from Redis:', redisError);
                }
            }

            const endTime = performance.now();
            console.log(`Total process took ${endTime - startTime} ms`);

            console.log('Financial data update complete.');

        } catch (error) {
            console.error('Error in fetchFinancialData:', error);
        }

        // Schedule the next execution immediately
        setImmediate(fetchAndProcessData);
    };

    // Start the initial execution
    fetchAndProcessData();
};

module.exports = fetchFinancialData;
