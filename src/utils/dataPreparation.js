const { fetchExpectedMove } = require('./optionsHelper');

const prepareData = async (data) => {
	try {
		if (!data || !data.underlying || data.underlying.length === 0) {
			return null;
		}

		const symbol = data.underlying[0];
		const updated = data.updated[0];

		let totalASK_Volume = 0;
		let totalGEX_OI = 0;
		let totalGEX_Volume = 0;

		const optionsLength = data.optionSymbol ? data.optionSymbol.length : 0;

		const strikeMap = {};

		for (let i = 0; i < optionsLength; i++) {
			const strike = data.strike[i];
			
			// Skip strikes with decimal values
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

			if (side === 'call') {
				strikeMap[strike].call.ASK_Volume += optionData.volume * optionData.ask;
				strikeMap[strike].call.GEX_OI += optionData.gamma * optionData.open_interest * 100 * Math.pow(strike, 2) * 0.01;
				strikeMap[strike].call.GEX_Volume += optionData.gamma * optionData.volume * 100 * Math.pow(strike, 2) * 0.01;
			} else if (side === 'put') {
				strikeMap[strike].put.ASK_Volume += optionData.volume * optionData.ask * -1;
				strikeMap[strike].put.GEX_OI += optionData.gamma * optionData.open_interest * -100 * Math.pow(strike, 2) * 0.01;
				strikeMap[strike].put.GEX_Volume += optionData.gamma * optionData.volume * -100 * Math.pow(strike, 2) * 0.01;
			}
		}

		const strikes = Object.values(strikeMap).sort((a, b) => a.strike - b.strike);

		strikes.forEach((strikeData) => {
			totalASK_Volume += strikeData.call.ASK_Volume + strikeData.put.ASK_Volume;
			totalGEX_OI += strikeData.call.GEX_OI + strikeData.put.GEX_OI;
			totalGEX_Volume += strikeData.call.GEX_Volume + strikeData.put.GEX_Volume;

			strikeData.call.ASK_Volume = Math.round(strikeData.call.ASK_Volume);
			strikeData.call.GEX_OI = Math.round(strikeData.call.GEX_OI);
			strikeData.call.GEX_Volume = Math.round(strikeData.call.GEX_Volume);
	  
			strikeData.put.ASK_Volume = Math.round(strikeData.put.ASK_Volume);
			strikeData.put.GEX_OI = Math.round(strikeData.put.GEX_OI);
			strikeData.put.GEX_Volume = Math.round(strikeData.put.GEX_Volume);
	
			strikeData.Net_ASK_Volume = strikeData.call.ASK_Volume + strikeData.put.ASK_Volume; 
			strikeData.Net_GEX_OI = strikeData.call.GEX_OI + strikeData.put.GEX_OI;
			strikeData.Net_GEX_Volume = strikeData.call.GEX_Volume + strikeData.put.GEX_Volume;
		});

		totalASK_Volume = Math.round(totalASK_Volume);
		totalGEX_OI = Math.round(totalGEX_OI);
		totalGEX_Volume = Math.round(totalGEX_Volume);

		let expectedMove;
		try {
			const { expectedMove: calculatedExpectedMove } = await fetchExpectedMove(symbol);
			expectedMove = calculatedExpectedMove;
		} catch (error) {
			expectedMove = null;
		}

		return {
			Symbol: symbol,
			Updated: updated,
			Total_ASK_Volume: totalASK_Volume,
			Total_GEX_OI: totalGEX_OI,
			Total_GEX_Volume: totalGEX_Volume,
			ExpectedMove: expectedMove,
			Data: strikes,
		};
	} catch (error) {
		return null;
	}
};

module.exports = prepareData;
