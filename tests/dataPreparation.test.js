const prepareData = require('../src/utils/dataPreparation');

describe('prepareData', () => {
  it('should prepare data correctly', async () => {
    const mockRawData = {
      underlying: ['SPY'],
      updated: [1623664800],
      optionSymbol: ['SPY230614C00400000', 'SPY230614P00400000'],
      strike: [400, 400],
      side: ['call', 'put'],
      openInterest: [100, 200],
      gamma: [0.01, 0.02],
      volume: [50, 100],
      ask: [5, 4],
    };

    const result = await prepareData(mockRawData);

    expect(result).toHaveProperty('Symbol', 'SPY');
    expect(result).toHaveProperty('Updated', 1623664800);
    expect(result.Data).toHaveLength(1);
    expect(result.Data[0]).toHaveProperty('strike', 400);
  });

  it('should return null for invalid data', async () => {
    const result = await prepareData({});
    expect(result).toBeNull();
  });
});

