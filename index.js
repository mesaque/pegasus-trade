import dotenv from 'dotenv'
dotenv.config()

import {PriceServiceConnection} from '@pythnetwork/price-service-client'

(async () => {
	const connection = new PriceServiceConnection("https://hermes.pyth.network", {
	priceFeedRequestConfig: {
		// Provide this option to retrieve signed price updates for on-chain contracts.
		// Ignore this option for off-chain use.
		binary: true,
	},
	}); // See Hermes endpoints section below for other endpoints

	const priceIds = [
	// You can find the ids of prices at https://pyth.network/developers/price-feed-ids
	"0xe62df6c8b4a85fe1a67db44dc12de5db330f7ac66b72dc658afedf0f4a415b43", // BTC/USD price id
	];

	let timeControl = {
		timestamp : false,
		price : false,
		state: true
	};
	connection.subscribePriceFeedUpdates(priceIds, async (priceFeed) => {
		if(false == timeControl.state) return;
		let timeNow = new Date().getTime();

		let priceObj = priceFeed.getPriceNoOlderThan(60);
		let currentPrice = (priceObj.price * 10 ** priceObj.expo).toFixed(2)

		if(false == timeControl.timestamp){
			timeControl.price = priceObj.price
			timeControl.timestamp = (timeNow + parseInt( process.env.TIME_LAPSE ) )
		}

		console.log(
			`Received update for BTC ${priceObj.price} => ${timeControl.price}`
		);

		let priceDiff = parseInt( timeControl.price ) * ( parseFloat ( process.env.PERCENT_CHANGE ) / 100 )
		if( priceObj.price >  ( parseInt( timeControl.price ) + priceDiff ) ){
			console.log('price going UP');
			await doTrade('long', timeControl, priceObj)
		}else if( priceObj.price <  ( parseInt( timeControl.price ) - priceDiff )){
			console.log('price going DOWN');
			await doTrade('short', timeControl, priceObj)
		}else{
			console.log('No catch');
		}
		if(timeControl.timestamp < (timeNow)) timeControl = { timestamp : false, price : false }
	});

	let doTrade = async (operation, timeControl, priceObj)=>{
		timeControl.state = false;
		console.log(`Do Trade - ${operation} ${priceObj.price} ${timeControl.price}`)
		await new Promise(resolve => setTimeout(resolve, 10000)); // sleep time
		timeControl.state = true;

	}

	// When using the subscription, make sure to close the websocket upon termination to finish the process gracefully.
	setTimeout(() => {
		connection.closeWebSocket();
	}, 70000);
})()