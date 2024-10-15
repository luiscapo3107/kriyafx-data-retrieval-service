const axios = require('axios');
const { getRedisClient } = require('../services/redisClient');
const prepareData = require('./dataPreparation');
const config = require('../config/config');
const fetchSPYLastPrice = require('./fetchSPY');
const isMarketOpen = require('./marketStatus');

const fetchFinancialData = () => {
    setInterval(async () => {
        try {
            console.log('Checking if market is open...');
            const marketOpen = await isMarketOpen();
            if (!marketOpen) {
                console.log('Market is closed. Skipping data fetch.');
                return;
            }

            console.log('Fetching options chain data...');
            const response = await axios.get(
                `https://api.marketdata.app/v1/options/chain/${config.ticker}?dte=${config.daysToExpire}&strikeLimit=${config.levelsOfStrike}&token=${config.token}`
            );
            let rawData = response.data;

            console.log('Preparing data...');
            const data = await prepareData(rawData);

            console.log('Fetching SPY last price...');
            const spyLastPrice = await fetchSPYLastPrice();

            console.log('Combining data...');
            const combinedData = {
                Options: data || {},
                Price: spyLastPrice.Last,
            };

            const timestamp = rawData.updated[0];

            console.log('Storing data in Redis...');
            const redisClient = await getRedisClient();
            await redisClient.zAdd('options_chain_data_zset', {
                score: timestamp,
                value: JSON.stringify(combinedData),
            });

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
