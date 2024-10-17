const { fetchExpectedMove } = require('./optionsHelper');
const { getRedisClient } = require('../services/redisClient');

const prepareData = async (data) => {
	try {
		if (!isValidData(data)) return null;

		const symbol = data.underlying[0];
		const updated = data.updated[0];

		const strikeMap = createStrikeMap(data);
		const strikes = Object.values(strikeMap).sort((a, b) => a.strike - b.strike);

		const historicalData = await fetchHistoricalData();
		const closestEntries = findClosestEntries(historicalData);

		calculateMetrics(strikes, closestEntries);

		const totalMetrics = calculateTotalMetrics(strikes);
		const expectedMove = await calculateExpectedMove(symbol);

		return {
			Symbol: symbol,
			Updated: updated,
			...totalMetrics,
			ExpectedMove: expectedMove,
			Data: strikes,
		};
	} catch (error) {
		console.error('Error in prepareData:', error);
		return null;
	}
};

const isValidData = (data) => data && data.underlying && data.underlying.length > 0;

const createStrikeMap = (data) => {
	const strikeMap = {};
	const optionsLength = data.optionSymbol ? data.optionSymbol.length : 0;

	for (let i = 0; i < optionsLength; i++) {
		const strike = data.strike[i];
		if (strike % 1 !== 0) continue;

		const side = data.side[i];
		const optionData = {
			open_interest: data.openInterest[i],
			gamma: data.gamma[i],
			volume: data.volume[i],
			ask: data.ask[i],
		};

		if (!strikeMap[strike]) {
			strikeMap[strike] = {
				strike: strike,
				call: { ASK_Volume: 0, GEX_OI: 0, GEX_Volume: 0 },
				put: { ASK_Volume: 0, GEX_OI: 0, GEX_Volume: 0 },
			};
		}

		updateStrikeData(strikeMap[strike], side, optionData);
	}

	return strikeMap;
};

const updateStrikeData = (strikeData, side, optionData) => {
	const multiplier = side === 'call' ? 1 : -1;
	strikeData[side].ASK_Volume += optionData.volume * optionData.ask * multiplier;
	strikeData[side].GEX_OI += optionData.gamma * optionData.open_interest * 100 * Math.pow(strikeData.strike, 2) * 0.01 * multiplier;
	strikeData[side].GEX_Volume += optionData.gamma * optionData.volume * 100 * Math.pow(strikeData.strike, 2) * 0.01 * multiplier;
};

const fetchHistoricalData = async () => {
	const redisClient = await getRedisClient();
	const now = Date.now();
	const fifteenMinutesAgo = now - 15 * 60 * 1000;
	const historicalData = await redisClient.zRangeByScore('options_chain_data_zset', fifteenMinutesAgo, '+inf', 'BYSCORE');
	return historicalData.map(entry => JSON.parse(entry));
};

const findClosestEntries = (historicalData) => {
	const now = Date.now();
	const timePoints = [1, 3, 5, 15];
	return timePoints.map(minutes => {
		const targetTime = now - minutes * 60 * 1000;
		return historicalData.reduce((prev, curr) => 
			Math.abs(curr.timestamp - targetTime) < Math.abs(prev.timestamp - targetTime) ? curr : prev
		);
	});
};

const calculateMetrics = (strikes, closestEntries) => {
	strikes.forEach((strikeData) => {
		strikeData.call.ASK_Volume = Math.round(strikeData.call.ASK_Volume);
		strikeData.call.GEX_OI = Math.round(strikeData.call.GEX_OI);
		strikeData.call.GEX_Volume = Math.round(strikeData.call.GEX_Volume);
		strikeData.put.ASK_Volume = Math.round(strikeData.put.ASK_Volume);
		strikeData.put.GEX_OI = Math.round(strikeData.put.GEX_OI);
		strikeData.put.GEX_Volume = Math.round(strikeData.put.GEX_Volume);

		strikeData.Net_ASK_Volume = strikeData.call.ASK_Volume + strikeData.put.ASK_Volume;
		strikeData.Net_GEX_OI = strikeData.call.GEX_OI + strikeData.put.GEX_OI;
		strikeData.Net_GEX_Volume = strikeData.call.GEX_Volume + strikeData.put.GEX_Volume;

		strikeData.ROC = calculateROC(strikeData, closestEntries);
	});
};

const calculateROC = (strikeData, closestEntries) => {
	const lastEntry = closestEntries[closestEntries.length - 1];
	return {
		ROC_Last: calculateROCValue(strikeData.Net_ASK_Volume, lastEntry?.Options?.Data?.find(s => s.strike === strikeData.strike)?.Net_ASK_Volume),
		ROC_1: calculateROCValue(strikeData.Net_ASK_Volume, closestEntries[0]?.Options?.Data?.find(s => s.strike === strikeData.strike)?.Net_ASK_Volume),
		ROC_3: calculateROCValue(strikeData.Net_ASK_Volume, closestEntries[1]?.Options?.Data?.find(s => s.strike === strikeData.strike)?.Net_ASK_Volume),
		ROC_5: calculateROCValue(strikeData.Net_ASK_Volume, closestEntries[2]?.Options?.Data?.find(s => s.strike === strikeData.strike)?.Net_ASK_Volume),
		ROC_15: calculateROCValue(strikeData.Net_ASK_Volume, closestEntries[3]?.Options?.Data?.find(s => s.strike === strikeData.strike)?.Net_ASK_Volume),
	};
};

const calculateROCValue = (current, previous) => {
	if (!previous || previous === 0) return null;
	return Number(((current - previous) / previous * 100).toFixed(2));
};

const calculateTotalMetrics = (strikes) => {
	return strikes.reduce((totals, strike) => {
		totals.Total_ASK_Volume += strike.Net_ASK_Volume;
		totals.Total_GEX_OI += strike.Net_GEX_OI;
		totals.Total_GEX_Volume += strike.Net_GEX_Volume;
		return totals;
	}, { Total_ASK_Volume: 0, Total_GEX_OI: 0, Total_GEX_Volume: 0 });
};

const calculateExpectedMove = async (symbol) => {
	try {
		const { expectedMove } = await fetchExpectedMove(symbol);
		return expectedMove;
	} catch (error) {
		console.error('Error fetching expected move:', error);
		return null;
	}
};

module.exports = prepareData;
