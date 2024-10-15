const axios = require('axios');
const { DateTime } = require('luxon');
const config = require('../config/config');

const fetchSPYLastPrice = async () => {
    try {
        const response = await axios.get(`https://api.marketdata.app/v1/stocks/quotes/${config.ticker}?token=${config.token}`);
        const data = response.data;

        if (data.s !== 'ok') {
            throw new Error('Failed to fetch SPY last price');
        }

        return {
            Symbol: 'SPY',
            Updated: DateTime.fromSeconds(data.updated[0]).toISO(),
            Last: data.last[0],
            updatedUnix: data.updated[0],
        };
    } catch (error) {
        console.error(`Error fetching SPY last price: ${error}`);
        throw error;
    }
};

module.exports = fetchSPYLastPrice;