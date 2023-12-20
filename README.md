# Pegasus

This a trade Bot where you can setup a trade based on volatility time of a token; example: If Bitcoin reachs 1% of volatility in a range of 15 seconds buy 10 USDC of SOL and sell it with 2% of gain.

## How to install
```
npm install
```

## Host to run
```
node index.js
```

## variables for .env file
```
RANGE_TIME:  (range in ms for checking volatility) ex:  15000
TIMEOUT_OPERATION: (time in ms that close your position if the price doesent reach your expectative of gain) ex: 900000
PERCENT_OF_STOPLOSS: (percent of money that you can risk) ex: 3
PERCENT_VOLATILITY: (percent of volatility you want to take an action) ex: 1
PERCENT_TO_GAIN: (percent to gain) ex: 5
PYTH_IDS: (pyth ids to fetch prices)
TRADE_A_TOKEN: (json with a setup of token that you want to trade) ex: '{"symbol": "USDC", "name" : "usdc"  ,"address":"EPjFWdd5AufqSSqeM2qN1xzybapC8G4wEGGkZwyTDt1v", "decimals" :6}'
TRADE_B_TOKEN: (json with a setup of token that you want to trade) '{"symbol": "SOL", "name" : "sol"  ,"address":"So11111111111111111111111111111111111111112", "decimals" :9}'
TRADE_AMOUNT: (amount of token for trade) ex: 10
PRIVATE_KEY: (private wallet key to be use by bot) ex: xAer41...
MY_SOLANA_RPC_ENDPOINT: (solana RPC endpoint to send your transaction) 
LOG_MODE: (log mode to fetch more data errors) ex: off
```


##
Free RPC server: https://www.helius.dev/

You can find the ids of prices at https://pyth.network/developers/price-feed-ids
