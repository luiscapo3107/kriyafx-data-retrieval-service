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
				call: { ASK_Volume: 0, GEX_OI: 0, GEX_Volume: 0, Liquidity: 0 },
				put: { ASK_Volume: 0, GEX_OI: 0, GEX_Volume: 0, Liquidity: 0 }
			});
		}

		const strikeData = strikes.get(strike);
		const side = data.side[i];
		const multiplier = side === 'call' ? 1 : -1;

		strikeData[side].ASK_Volume += data.volume[i] * data.ask[i] * multiplier;
		strikeData[side].GEX_OI += data.gamma[i] * data.openInterest[i] * 100 * Math.pow(strike, 2) * 0.01 * multiplier;
		strikeData[side].GEX_Volume += data.gamma[i] * data.volume[i] * 100 * Math.pow(strike, 2) * 0.01 * multiplier;
		strikeData[side].Liquidity += (data.bidSize[i] * data.bid[i] - data.askSize[i] * data.ask[i]) * multiplier;
	}

	return Array.from(strikes.values()).sort((a, b) => a.strike - b.strike);
};

const prepareData = async (data) => {
	
	try {
		if (!isValidData(data)) return null;

		const symbol = data.underlying[0];
		const updated = data.updated[0];

		const strikes = processStrikeData(data);  // Use the processStrikeData function

		calculateMetrics(strikes);

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

const calculateMetrics = (strikes) => {
	strikes.forEach((strikeData) => {
		// Calculate individual strike metrics
		strikeData.Net_ASK_Volume = strikeData.call.ASK_Volume + strikeData.put.ASK_Volume;
		strikeData.Net_GEX_OI = strikeData.call.GEX_OI + strikeData.put.GEX_OI;
		strikeData.Net_GEX_Volume = strikeData.call.GEX_Volume + strikeData.put.GEX_Volume;
		strikeData.Net_Liquidity = strikeData.call.Liquidity + strikeData.put.Liquidity; //If Net liquidity is > 0, then we have a bullish market		
	});

	return { strikes };
};

const calculateTotalMetrics = (strikes) => {
	return strikes.reduce((totals, strike) => {
		totals.Total_ASK_Volume += strike.Net_ASK_Volume;
		totals.Total_GEX_OI += strike.Net_GEX_OI;
		totals.Total_GEX_Volume += strike.Net_GEX_Volume;
		totals.Total_Liquidity += strike.Net_Liquidity;
		return totals;
	}, { Total_ASK_Volume: 0, Total_GEX_OI: 0, Total_GEX_Volume: 0, Total_Liquidity: 0 });
};

module.exports = prepareData;
