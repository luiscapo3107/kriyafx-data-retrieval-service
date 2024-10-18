const axios = require('axios');
const { getRedisClient } = require('../services/redisClient');
const prepareData = require('./dataPreparation');
const config = require('../config/config');
const isMarketOpen = require('./marketStatus');
const { fetchOptionsChain, fetchExpectedMove, fetchSPYLastPrice, fetchHistoricalDataPoints } = require('./fetchDataHelper');

const fetchFinancialData = () => {
    setInterval(async () => {
        try {
            console.log('Checking if market is open...');
            const marketOpen = await isMarketOpen();
            if (!marketOpen) {
                console.log('Market is closed. Skipping data fetch.');
                return;
            }

            console.log('Fetching financial data...');
            const [optionsChainData, spyLastPrice, expectedMoveData, historicalDataPoints] = await Promise.all([
                fetchOptionsChain(config.ticker),
                fetchSPYLastPrice(),
                fetchExpectedMove(config.ticker),
                fetchHistoricalDataPoints(config.ticker)
            ]);

            console.log('Preparing data...');
            const data = await prepareData(optionsChainData, historicalDataPoints);

            console.log('Combining data...');
            const combinedData = {
                Options: data || {},
                Price: spyLastPrice.Last,
                ExpectedMove: expectedMoveData.expectedMove
            };

            const timestamp = optionsChainData.updated[0];

            console.log('Storing data in Redis...');
            const redisClient = await getRedisClient();
            await redisClient.zAdd('options_chain_data_zset', {
                score: timestamp,
                value: JSON.stringify(combinedData),
            });

            // Publish update notification
            console.log('Publishing update notification...');
            await redisClient.publish('options_chain_update', 'update');

            console.log('Managing Redis entries...');
            const maxEntries = config.redisMaxEntries;
            const totalEntries = await redisClient.zCard('options_chain_data_zset');
            if (totalEntries > maxEntries) {
                await redisClient.zRemRangeByRank('options_chain_data_zset', 0, totalEntries - maxEntries - 1);
            }

            console.log('Financial data update complete.');
        } catch (error) {
            console.error('Error in fetchFinancialData:', error);
        }
    }, config.retrieveInterval);
};

module.exports = fetchFinancialData;
