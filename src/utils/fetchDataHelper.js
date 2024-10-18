const axios = require('axios');
const config = require('../config/config');
const { getRedisClient } = require('../services/redisClient');

const fetchOptionsChain = async (symbol) => {
  try {
    const response = await axios.get(
      `https://api.marketdata.app/v1/options/chain/${symbol}?dte=${config.daysToExpire}&strikeLimit=${config.levelsOfStrike}&token=${config.token}`
    );
    return response.data;
  } catch (error) {
    console.error(`Error fetching options chain for ${symbol}:`, error);
    throw error;
  }
};

const fetchExpectedMove = async (symbol) => {
  try {
    const response = await axios.get(
      `https://api.marketdata.app/v1/options/chain/${symbol}?dte=0&delta=0.5&token=${config.token}`
    );
    const data = response.data;

    if (data.s !== 'ok' || data.optionSymbol.length < 2) {
      throw new Error('Invalid data received from API');
    }

    const callIndex = data.side.indexOf('call');
    const putIndex = data.side.indexOf('put');

    if (callIndex === -1 || putIndex === -1) {
      throw new Error('Could not find both call and put options');
    }

    const callPrice = data.last[callIndex];
    const putPrice = data.last[putIndex];
    const expectedMove = ((callPrice + putPrice) * 0.85);

    return {
      expectedMove,
      callPrice,
      putPrice,
      underlyingPrice: data.underlyingPrice[0],
      updated: data.updated[0]
    };
  } catch (error) {
    console.error(`Error fetching expected move for ${symbol}:`, error);
    throw error;
  }
};

const fetchSPYLastPrice = async () => {
  try {
    const response = await axios.get(`https://api.marketdata.app/v1/stocks/quotes/SPY/?token=${config.token}`);
    const data = response.data;

    if (data.s !== 'ok' || !data.last || data.last.length === 0) {
      throw new Error('Invalid data received from API');
    }

    return {
      Last: data.last[0],
      Updated: data.updated[0]
    };
  } catch (error) {
    console.error('Error fetching SPY last price:', error);
    throw error;
  }
};

const fetchHistoricalDataPoints = async (symbol) => {
  const now = Date.now();
  const timePoints = [1, 3, 5, 15].map(minutes => now - minutes * 60 * 1000);
  
  const redisClient = await getRedisClient();
  const results = await Promise.all(timePoints.map(time => 
    redisClient.zRevRangeByScore('options_chain_data_zset', '+inf', time, 'LIMIT', 0, 1)
  ));

  return results.map(result => result[0] ? JSON.parse(result[0]) : null);
};

module.exports = {
  fetchOptionsChain,
  fetchExpectedMove,
  fetchSPYLastPrice,
  fetchHistoricalDataPoints
};
