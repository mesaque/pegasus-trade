import dotenv from 'dotenv'
dotenv.config()

import {PriceServiceConnection} from '@pythnetwork/price-service-client'
import fetch from 'cross-fetch';
import { Connection, Keypair, VersionedTransaction } from '@solana/web3.js';
import { Wallet } from '@project-serum/anchor';
import bs58 from 'bs58';

(async () => {
	const connection = new PriceServiceConnection("https://hermes.pyth.network", {
	priceFeedRequestConfig: {
		// Provide this option to retrieve signed price updates for on-chain contracts.
		// Ignore this option for off-chain use.
		binary: true,
	},
	}); // See Hermes endpoints section below for other endpoints

	// You can find the ids of prices at https://pyth.network/developers/price-feed-ids
	const priceIds = [  process.env.PYTH_IDS ];
	const LOG_MODE = process.env.LOG_MODE;
	const connSolana = new Connection(process.env.MY_SOLANA_RPC_ENDPOINT);
	const wallet = new Wallet(Keypair.fromSecretKey(bs58.decode(process.env.PRIVATE_KEY || '')));

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

		let priceDiff = parseInt( timeControl.price ) * ( parseFloat ( process.env.PERCENT_VOLATILITY ) / 100 )
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
		console.log(`Do Trade - ${operation} ${priceObj.price} ${timeControl.price}`)
		if("long" !== operation) return;

		timeControl.state = false;
		let tokenAObj = JSON.parse(process.env.TRADE_A_TOKEN);
		let tokenA = tokenAObj.address;
		let tokenBObj = JSON.parse(process.env.TRADE_B_TOKEN);
		let tokenB = tokenBObj.address;
		let inputAmount = parseInt( process.env.TRADE_AMOUNT ) * (10** tokenAObj.decimals);

		//await new Promise(resolve => setTimeout(resolve, 10000)); // sleep time
		let quoteResponse = await doQuote(tokenA, tokenB, inputAmount, tokenBObj);
		if(false == quoteResponse) return;

		//console.log( JSON.stringify( quoteResponse))
		if(quoteResponse.hasOwnProperty('error')){console.log(quoteResponse, tokenBObj.address, tokenBObj.symbol ); return;}
		if( undefined == quoteResponse){return;}
		let outAmount = parseFloat( (quoteResponse.outAmount / (10** tokenBObj.decimals)).toFixed(5) )

		console.log(`> Amount of ${process.env.TRADE_AMOUNT} ${tokenAObj.symbol} bought: ${outAmount} ${tokenBObj.symbol}`);

		let swapId = await doSwap(quoteResponse);
		if(false == swapId){
			timeControl.state = true;
			return;
		}
		console.log(`Done ${swapId}`)

		await new Promise(resolve => setTimeout(resolve, 30000)); // sleep time

		console.log(`Selling => ${outAmount} ${tokenBObj.symbol}`)
		quoteResponse = await doQuote(tokenB, tokenA, quoteResponse.outAmount, tokenAObj);
		if(false == quoteResponse) return;

		if(quoteResponse.hasOwnProperty('error')){console.log(quoteResponse, tokenBObj.address, tokenBObj.symbol ); return;}
		let outAAmount = parseFloat( (quoteResponse.outAmount / (10** tokenAObj.decimals)).toFixed(5) )

		console.log(`> Amount of ${outAmount} ${tokenBObj.symbol} Sold for: ${outAAmount} ${tokenAObj.symbol}`);
		swapId = await doSwap(quoteResponse);
		if(false == swapId) return;
		console.log(`Done ${swapId}`)

		timeControl.state = true;

	}
	let doQuote = async (tokenA, tokenB, inputAmount, tokenBObj) => {
		let quoteResponse = false;
		try {
			quoteResponse = await (
				await fetch(
					`https://quote-api.jup.ag/v6/quote?swapMode=ExactIn&
					inputMint=${tokenA}&
					outputMint=${tokenB}&
					amount=${inputAmount}&
					slippageBps=100`
				)
			).json();
			if('on' == LOG_MODE) console.log( new Date().getTime() + ' quoteResponse: ' + JSON.stringify(quoteResponse) );
		} catch (error) { console.error(error); return false; }
		return quoteResponse;
	}
	let doSwap = async (quoteResponse, tokenBObj) => {
		const { swapTransaction } = await (
			await fetch('https://quote-api.jup.ag/v6/swap', {
			method: 'POST',
			headers: {
				'Content-Type': 'application/json'
			},
			body: JSON.stringify({
				// quoteResponse from /quote api
				quoteResponse,
				// user public key to be used for the swap
				userPublicKey: wallet.publicKey.toString(),
				// auto wrap and unwrap SOL. default is true
				wrapAndUnwrapSol: true,
				computeUnitPriceMicroLamports : 'auto',
				// feeAccount is optional. Use if you want to charge a fee.  feeBps must have been passed in /quote API.
				// feeAccount: "fee_account_public_key"
			})
			})
		).json();

		if('on' == LOG_MODE) console.log(new Date().getTime() + ` {${tokenBObj.symbol}} with log: ${JSON.stringify(swapTransaction)}` );
		// deserialize the transaction
		const swapTransactionBuf = Buffer.from(swapTransaction, 'base64');
		var transaction = VersionedTransaction.deserialize(swapTransactionBuf);
		//console.log(transaction);

		// sign the transaction
		transaction.sign([wallet.payer]);

		// Execute the transaction
		const rawTransaction = transaction.serialize()
		if('on' == LOG_MODE) console.log(new Date().getTime() + ` About to run  sendRawTransaction for {${tokenBObj.name}} ` );
		const txid = await connSolana.sendRawTransaction(rawTransaction, {
			skipPreflight: true,
			maxRetries: 2
		});
		try {
			if('on' == LOG_MODE) console.log(new Date().getTime() + ` Waitting on confirming confirmTransaction for {${tokenBObj.name}} ` );
			await connSolana.confirmTransaction(txid);
		} catch (error) {
			console.error(error)
			return false;
		}

		return txid;

	}

	// When using the subscription, make sure to close the websocket upon termination to finish the process gracefully.
	//setTimeout(() => {
	//	connection.closeWebSocket();
	//}, 70000);
})()