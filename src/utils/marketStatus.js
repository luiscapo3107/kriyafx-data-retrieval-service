const axios = require('axios');
const config = require('../config/config');
const { DateTime } = require('luxon');

const isWeekend = (date) => {
    return date.weekday > 5;
};

const isWithinMarketHours = (date) => {
    const marketOpenTime = date.set({ 
        hour: config.marketOpenHour, 
        minute: config.marketOpenMinute 
    });
    const marketCloseTime = date.set({ 
        hour: config.marketCloseHour, 
        minute: config.marketCloseMinute 
    });

    return date >= marketOpenTime && date <= marketCloseTime;
};

const fetchMarketStatusFromAPI = async () => {
    try {
        const response = await axios.get(`https://api.marketdata.app/v1/markets/status/?token=${config.token}`);
        return response.data.status[0] === 'open';
    } catch (error) {
        console.error(`Error fetching market status from API: ${error}`);
        return false;
    }
};

const isMarketOpen = async () => {
    // Check if market status checking is enabled
    if (!config.checkMarketStatus) {
        console.log('Market status checking is disabled. Assuming market is open.');
        return true;
    }

    const nowCET = DateTime.now().setZone('Europe/Berlin');

    try {
        if (isWeekend(nowCET)) {
            console.log('It\'s a weekend. Market is closed.');
            return false;
        }

        if (!isWithinMarketHours(nowCET)) {
            console.log('Outside specified hours. Market is closed.');
            return false;
        }

        const status = await fetchMarketStatusFromAPI();
        console.log(`Market status: ${status ? 'open' : 'closed'}`);

        return status;
    } catch (error) {
        console.error(`Error checking market status: ${error}`);
        return false;
    }
};

module.exports = isMarketOpen;
