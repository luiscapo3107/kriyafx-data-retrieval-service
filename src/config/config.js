// config/config.js
require('dotenv').config();

module.exports = {
  port: process.env.PORT || 3001,
  token: process.env.TOKEN,
  retrieveInterval: process.env.RETRIEVE_INTERVAL || 60000,
  daysToExpire: process.env.DAYS_TO_EXPIRE || 0,
  levelsOfStrike: process.env.LEVELS_OF_STRIKE || 20,
  ticker: process.env.TICKER || 'SPY',
  redisMaxEntries: process.env.REDIS_MAX_ENTRIES || 100000,
  marketOpenHour: parseInt(process.env.MARKET_OPEN_HOUR) || 7,
  marketOpenMinute: parseInt(process.env.MARKET_OPEN_MINUTE) || 25,
  marketCloseHour: parseInt(process.env.MARKET_CLOSE_HOUR) || 22,
  marketCloseMinute: parseInt(process.env.MARKET_CLOSE_MINUTE) || 30,
  checkMarketStatus: process.env.CHECK_MARKET_STATUS === 'TRUE',
  skipRedisCheck: process.env.SKIP_REDIS_CHECK === 'true'
};
