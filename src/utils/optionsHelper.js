const axios = require('axios');
const config = require('../config/config');

const fetchExpectedMove = async (symbol) => {
  try {
    const response = await axios.get(`https://api.marketdata.app/v1/options/chain/${symbol}?dte=0&delta=0.5&token=${config.token}`);
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

module.exports = {
  fetchExpectedMove
};
