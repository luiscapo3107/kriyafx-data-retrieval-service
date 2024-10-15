const axios = require('axios');
const config = require('../config/config');
const { DateTime } = require('luxon');

const isMarketOpen = async () => {
    try {
        const nowCET = DateTime.now().setZone('Europe/Berlin');

        // Check if it's a weekend (Saturday or Sunday)
        if (nowCET.weekday > 5) {
            console.log('It\'s a weekend. Market is closed.');
            return false;
        }

        const marketOpenTime = nowCET.set({ 
            hour: config.marketOpenHour, 
            minute: config.marketOpenMinute 
        });
        const marketCloseTime = nowCET.set({ 
            hour: config.marketCloseHour, 
            minute: config.marketCloseMinute 
        });

        const isWithinMarketHours = nowCET >= marketOpenTime && nowCET <= marketCloseTime;

        if (!isWithinMarketHours) {
            console.log('Outside specified hours. Skipping market status check.');
            return false;
        }

        const response = await axios.get(`https://api.marketdata.app/v1/markets/status/?token=${config.token}`);
        const status = response.data.status[0];
        console.log(`Market status: ${status}`);

        return status === 'open';
    } catch (error) {
        console.error(`Error checking market status: ${error}`);
        return false;
    }
};

module.exports = isMarketOpen;
