const axios = require('axios');
const fetchFinancialData = require('../src/utils/fetchFinancialData');
const isMarketOpen = require('../src/utils/marketStatus');
const fetchSPYLastPrice = require('../src/utils/fetchSPY');
const { getRedisClient } = require('../src/services/redisClient');

jest.mock('axios');
jest.mock('../src/services/redisClient');
jest.mock('../src/utils/marketStatus');
jest.mock('../src/utils/fetchSPY');

describe('fetchFinancialData', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    isMarketOpen.mockImplementation(() => Promise.resolve(true));
  });

  it('should fetch and store data when market is open', async () => {
    const mockRedisClient = {
      zAdd: jest.fn(),
      zCard: jest.fn().mockResolvedValue(100),
      zRemRangeByRank: jest.fn(),
    };
    getRedisClient.mockResolvedValue(mockRedisClient);
    axios.get.mockResolvedValue({ data: { underlying: ['SPY'], updated: [1623664800] } });
    fetchSPYLastPrice.mockResolvedValue({ Last: 400 });

    await fetchFinancialData();

    expect(isMarketOpen).toHaveBeenCalled();
    expect(axios.get).toHaveBeenCalled();
    expect(fetchSPYLastPrice).toHaveBeenCalled();
    expect(mockRedisClient.zAdd).toHaveBeenCalled();
  });

  it('should not fetch data when market is closed', async () => {
    isMarketOpen.mockResolvedValue(false);

    await fetchFinancialData();

    expect(isMarketOpen).toHaveBeenCalled();
    expect(axios.get).not.toHaveBeenCalled();
  });
});
