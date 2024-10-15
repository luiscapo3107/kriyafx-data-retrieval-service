const axios = require('axios');
const { DateTime } = require('luxon');
const fetchSPYLastPrice = require('../src/utils/fetchSPY');

jest.mock('axios');
jest.mock('luxon', () => ({
  DateTime: {
    fromSeconds: jest.fn(() => ({
      toISO: jest.fn(() => '2023-06-14T10:00:00.000Z'),
    })),
  },
}));

describe('fetchSPYLastPrice', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('should fetch SPY last price successfully', async () => {
    axios.get.mockResolvedValue({
      data: {
        s: 'ok',
        updated: [1623664800],
        last: [400],
      },
    });

    const result = await fetchSPYLastPrice();

    expect(result).toHaveProperty('Symbol', 'SPY');
    expect(result).toHaveProperty('Last', 400);
  });

  it('should throw an error when API call fails', async () => {
    axios.get.mockRejectedValue(new Error('API Error'));

    await expect(fetchSPYLastPrice()).rejects.toThrow('API Error');
  });
});

