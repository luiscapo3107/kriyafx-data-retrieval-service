const { fetchExpectedMove, fetchHistoricalDataPoints } = require('./fetchDataHelper');

const processStrikeData = (data) => {
	const strikes = new Map();
	const optionsLength = data.optionSymbol ? data.optionSymbol.length : 0;

	for (let i = 0; i < optionsLength; i++) {
		const strike = data.strike[i];
		if (strike % 1 !== 0) continue;

		if (!strikes.has(strike)) {
			strikes.set(strike, {
				strike: strike,
				call: { ASK_Volume: 0, GEX_OI: 0, GEX_Volume: 0 },
				put: { ASK_Volume: 0, GEX_OI: 0, GEX_Volume: 0 }
			});
		}

		const strikeData = strikes.get(strike);
		const side = data.side[i];
		const multiplier = side === 'call' ? 1 : -1;

		strikeData[side].ASK_Volume += data.volume[i] * data.ask[i] * multiplier;
		strikeData[side].GEX_OI += data.gamma[i] * data.openInterest[i] * 100 * Math.pow(strike, 2) * 0.01 * multiplier;
		strikeData[side].GEX_Volume += data.gamma[i] * data.volume[i] * 100 * Math.pow(strike, 2) * 0.01 * multiplier;
	}

	return Array.from(strikes.values()).sort((a, b) => a.strike - b.strike);
};

const prepareData = async (data, historicalDataPoints) => {
	try {
		if (!isValidData(data)) return null;

		const symbol = data.underlying[0];
		const updated = data.updated[0];

		if (historicalDataPoints.length === 0) {
			console.warn('No historical data available. ROC values will be 0.');
		}

		const strikes = processStrikeData(data);  // Use the new processStrikeData function

		const closestEntries = findClosestEntries(historicalDataPoints);
		console.log('Closest entries:', closestEntries.map(entry => entry ? 'Data present' : 'Null'));

		calculateMetrics(strikes, closestEntries);

		const totalMetrics = calculateTotalMetrics(strikes);

		const resultObject = {
			Symbol: symbol,
			Updated: updated,
			...totalMetrics,
			Data: strikes,
		};

		return resultObject;

	} catch (error) {
		console.error('Error in prepareData:', error);
		return null;
	}
};

const isValidData = (data) => data && data.underlying && data.underlying.length > 0;

const findClosestEntries = (historicalData) => {
	console.log('Finding closest entries from', historicalData.length, 'historical data points');
	const now = Date.now();
	const timePoints = [1, 3, 5, 15];
	return timePoints.map(minutes => {
		const targetTime = now - minutes * 60 * 1000;
		if (historicalData.length === 0) {
			console.log(`No historical data for ${minutes} minute(s) ago`);
			return null;
		}
		const closestEntry = historicalData.reduce((prev, curr) => 
			Math.abs(curr.timestamp - targetTime) < Math.abs(prev.timestamp - targetTime) ? curr : prev
			);
		console.log(`Closest entry for ${minutes} minute(s) ago:`, closestEntry ? `Found (timestamp: ${new Date(closestEntry.timestamp)})` : 'Not found');
		return closestEntry;
	});
};

const calculateMetrics = (strikes, historicalData) => {
	let totalASKVolume = 0, totalGEXOI = 0, totalGEXVolume = 0;

	strikes.forEach((strikeData) => {
		// Calculate individual strike metrics
		strikeData.Net_ASK_Volume = strikeData.call.ASK_Volume + strikeData.put.ASK_Volume;
		strikeData.Net_GEX_OI = strikeData.call.GEX_OI + strikeData.put.GEX_OI;
		strikeData.Net_GEX_Volume = strikeData.call.GEX_Volume + strikeData.put.GEX_Volume;

			// Calculate ROC
		strikeData.ROC = calculateROC(strikeData, historicalData);

			// Accumulate totals
		totalASKVolume += strikeData.Net_ASK_Volume;
		totalGEXOI += strikeData.Net_GEX_OI;
		totalGEXVolume += strikeData.Net_GEX_Volume;
	});

	return { strikes, totalASKVolume, totalGEXOI, totalGEXVolume };
};

const calculateROC = (strikeData, closestEntries) => {
	console.log('Calculating ROC for strike:', strikeData.strike);
	const lastEntry = closestEntries[closestEntries.length - 1];
	const result = {
		ROC_Last: calculateROCValue(strikeData.Net_ASK_Volume, lastEntry?.Options?.Data?.find(s => s?.strike === strikeData.strike)?.Net_ASK_Volume),
		ROC_1: calculateROCValue(strikeData.Net_ASK_Volume, closestEntries[0]?.Options?.Data?.find(s => s?.strike === strikeData.strike)?.Net_ASK_Volume),
		ROC_3: calculateROCValue(strikeData.Net_ASK_Volume, closestEntries[1]?.Options?.Data?.find(s => s?.strike === strikeData.strike)?.Net_ASK_Volume),
		ROC_5: calculateROCValue(strikeData.Net_ASK_Volume, closestEntries[2]?.Options?.Data?.find(s => s?.strike === strikeData.strike)?.Net_ASK_Volume),
		ROC_15: calculateROCValue(strikeData.Net_ASK_Volume, closestEntries[3]?.Options?.Data?.find(s => s?.strike === strikeData.strike)?.Net_ASK_Volume),
	};
	console.log('ROC result:', result);
	return result;
};

const calculateROCValue = (current, previous) => {
	console.log('Calculating ROC value:', { current, previous });
	if (!previous || previous === 0) {
		console.log('ROC value is null due to invalid previous value');
		return null;
	}
	const result = Number(((current - previous) / previous * 100).toFixed(2));
	console.log('ROC value calculated:', result);
	return result;
};

const calculateTotalMetrics = (strikes) => {
	return strikes.reduce((totals, strike) => {
		totals.Total_ASK_Volume += strike.Net_ASK_Volume;
		totals.Total_GEX_OI += strike.Net_GEX_OI;
		totals.Total_GEX_Volume += strike.Net_GEX_Volume;
		return totals;
	}, { Total_ASK_Volume: 0, Total_GEX_OI: 0, Total_GEX_Volume: 0 });
};

module.exports = prepareData;
