// services/redisClient.js
const Redis = require('redis');
const schedule = require('node-schedule');
require('dotenv').config();

let redisClient;

async function initializeRedisClient() {
  if (!redisClient || !redisClient.isOpen) {
    redisClient = Redis.createClient({
    });

    redisClient.on('error', (err) => console.log('Redis Client Error', err));

    await redisClient.connect();
  }
}

async function getRedisClient() {
  await initializeRedisClient();
  return redisClient;
}

async function closeRedisClient() {
  if (redisClient && redisClient.isOpen) {
    await redisClient.quit();
  }
}

async function flushRedisDB() {
  const client = await getRedisClient();
  await client.flushDb();
  console.log('Redis DB flushed at market close');
}

function scheduleRedisFlush() {
  const closeHour = parseInt(process.env.MARKET_CLOSE_HOUR);
  const closeMinute = parseInt(process.env.MARKET_CLOSE_MINUTE);

  schedule.scheduleJob(`${closeMinute} ${closeHour} * * 1-5`, flushRedisDB);
  console.log(`Scheduled Redis DB flush for ${closeHour}:${closeMinute} on weekdays`);
}

const checkRedisConnection = async () => {
    try {
        const redisClient = await getRedisClient();
        await redisClient.ping();
        console.log('Successfully connected to Redis');
    } catch (error) {
        console.error('Failed to connect to Redis:', error);
    }
};

// Call this function when your app starts
checkRedisConnection();

module.exports = { getRedisClient, closeRedisClient, scheduleRedisFlush };
