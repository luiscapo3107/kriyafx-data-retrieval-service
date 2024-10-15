require('dotenv').config();
const fetchFinancialData = require('./utils/fetchFinancialData');
const { scheduleRedisFlush } = require('./services/redisClient');

console.log('Starting Data Retrieval Server...');
fetchFinancialData();

// Schedule Redis flush at market close
scheduleRedisFlush();
