const axios = require('axios');
const { DateTime } = require('luxon');
const isMarketOpen = require('../src/utils/marketStatus');

jest.mock('axios');
jest.mock('luxon', () => ({
  DateTime: {
    now: jest.fn(() => ({
      setZone: jest.fn(() => ({
        weekday: 3,
        set: jest.fn(() => DateTime.now()),
      })),
    })),
  },
}));

describe('isMarketOpen', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('should return true when market is open', async () => {
    axios.get.mockResolvedValue({ data: { status: ['open'] } });

    const result = await isMarketOpen();

    expect(result).toBe(true);
  });

  it('should return false when market is closed', async () => {
    axios.get.mockResolvedValue({ data: { status: ['closed'] } });

    const result = await isMarketOpen();

    expect(result).toBe(false);
  });

  it('should return false on weekends', async () => {
    DateTime.now.mockImplementation(() => ({
      setZone: jest.fn(() => ({
        weekday: 6,
        set: jest.fn(() => DateTime.now()),
      })),
    }));

    const result = await isMarketOpen();

    expect(result).toBe(false);
  });
});

