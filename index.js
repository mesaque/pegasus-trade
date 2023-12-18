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
	"0xff61491a931112ddf1bd8147cd1b641375f79f5825126d665480874634fd0ace", // ETH/USD price id
	];

	// Get the latest values of the price feeds as json objects.
	// If you set `binary: true` above, then this method also returns signed price updates for the on-chain Pyth contract.
	const currentPrices = await connection.getLatestPriceFeeds(priceIds);

	console.log(currentPrices)
})()