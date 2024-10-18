const axios = require('axios');
const config = require('../config/config');
const { DateTime } = require('luxon');

let cachedMarketStatus = null;
let lastCheckedDate = null;

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

const getCachedStatus = (today) => {
    if (cachedMarketStatus !== null && lastCheckedDate === today) {
        console.log('Using cached market status:', cachedMarketStatus);
        return cachedMarketStatus;
    }
    return null;
};

const updateCachedStatus = (status, today) => {
    cachedMarketStatus = status;
    lastCheckedDate = today;
};

const isMarketOpen = async () => {
    const nowCET = DateTime.now().setZone('Europe/Berlin');
    const today = nowCET.toISODate();

    const cachedStatus = getCachedStatus(today);
    if (cachedStatus !== null) {
        return cachedStatus;
    }

    try {
        if (isWeekend(nowCET)) {
            console.log('It\'s a weekend. Market is closed.');
            updateCachedStatus(false, today);
            return false;
        }

        if (!isWithinMarketHours(nowCET)) {
            console.log('Outside specified hours. Market is closed.');
            updateCachedStatus(false, today);
            return false;
        }

        const status = await fetchMarketStatusFromAPI();
        console.log(`Market status: ${status ? 'open' : 'closed'}`);

        updateCachedStatus(status, today);
        return status;
    } catch (error) {
        console.error(`Error checking market status: ${error}`);
        return false;
    }
};

module.exports = isMarketOpen;
