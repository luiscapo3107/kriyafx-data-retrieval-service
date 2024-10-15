const { getRedisClient, closeRedisClient, scheduleRedisFlush } = require('../src/services/redisClient');
const Redis = require('redis');
const schedule = require('node-schedule');

jest.mock('redis');
jest.mock('node-schedule');

describe('Redis Client', () => {
  let mockRedisClient;

  beforeEach(() => {
    mockRedisClient = {
      connect: jest.fn(),
      quit: jest.fn(),
      flushDb: jest.fn(),
      isOpen: true,
      on: jest.fn(),
    };
    Redis.createClient.mockReturnValue(mockRedisClient);
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  test('getRedisClient initializes and returns a Redis client', async () => {
    const client = await getRedisClient();
    expect(Redis.createClient).toHaveBeenCalled();
    expect(mockRedisClient.connect).toHaveBeenCalled();
    expect(client).toBe(mockRedisClient);
  });

  test('closeRedisClient closes the Redis connection', async () => {
    await getRedisClient(); // Initialize the client
    await closeRedisClient();
    expect(mockRedisClient.quit).toHaveBeenCalled();
  });

  test('scheduleRedisFlush schedules a job', () => {
    scheduleRedisFlush();
    expect(schedule.scheduleJob).toHaveBeenCalled();
  });

  test('scheduled job flushes the Redis DB', async () => {
    scheduleRedisFlush();
    const scheduledJobCallback = schedule.scheduleJob.mock.calls[0][1];
    await scheduledJobCallback();
    expect(mockRedisClient.flushDb).toHaveBeenCalled();
  });
});
