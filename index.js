const axios = require("axios");
const converter = require("json-2-csv");
const fs = require("fs");
const rateLimit = require("axios-rate-limit");

// Binance has pretty scrict rate limiting, so only allowing 1 request per second to avoid issues.
const rateLimitedAxios = rateLimit(axios.create(), {
  maxRequests: 1,
  perMilliseconds: 1000,
});

const getSymbols = async () => {
  try {
    return axios.get("https://api.bybit.com/v2/public/symbols");
  } catch (err) {
    console.log("err");
  }
};

const getTickers = async () => {
  try {
    return axios.get("https://api.bybit.com/v2/public/tickers");
  } catch (err) {
    console.log("err");
  }
};

const getAmountofBacktestDataDays = async (symbol) => {
  try {
    const response = await rateLimitedAxios.get(
      `https://fapi.binance.com/fapi/v1/aggTrades?symbol=${symbol}&limit=1000&fromId=1`
    );
    const timestamp = response.data[0].T;
    return Math.floor((now - timestamp) / 1000 / 60 / 60 / 24);
  } catch (err) {
    console.error("Error fetching amount of backtest days, returning 0");
    return 0;
  }
};

const now = Date.now();

const start = async () => {
  // Fetch data from bybit public rest api
  const symbols = await getSymbols();
  const tickers = await getTickers();

  const symbolsData = symbols.data.result;
  const tickersData = tickers.data.result;

  // Only use pairs with USDT as the quote currency
  const filteredSymbols = symbolsData.filter(
    (symbolData) => symbolData.quote_currency === "USDT"
  );

  let mergedData = [];

  for (const filteredSymbol of filteredSymbols) {
    console.log(`Processing data for ${filteredSymbol.name}...`);

    const tickerData = tickersData.find(
      ({ symbol }) => symbol === filteredSymbol.name
    );

    const amountOfBacktestDataDays = await getAmountofBacktestDataDays(
      filteredSymbol.name
    );

    mergedData.push({
      name: filteredSymbol.name,
      qty_step: filteredSymbol.lot_size_filter.qty_step,
      price: tickerData.last_price,
      minimumOrderSizeUSD: parseFloat(
        tickerData.last_price * filteredSymbol.lot_size_filter.qty_step
      ).toFixed(2),
      totalVolume: tickerData.total_volume,
      amountOfBacktestDataDays,
    });
  }

  console.log("Sorting ascendingly on order size...");

  // sort ascending
  const sortedMergedData = mergedData.sort(
    (a, b) => a.minimumOrderSizeUSD - b.minimumOrderSizeUSD
  );

  console.log("Saving to CSV file...");

  converter.json2csv(sortedMergedData, (err, csv) => {
    if (err) throw err;
    fs.writeFileSync("bybit.csv", csv);
  });
};

start();
