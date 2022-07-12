const axios = require("axios");
const converter = require("json-2-csv");
const fs = require("fs");

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

  filteredSymbols.forEach((filteredSymbol) => {
    const tickerData = tickersData.find(
      ({ symbol }) => symbol === filteredSymbol.name
    );

    mergedData.push({
      name: filteredSymbol.name,
      qty_step: filteredSymbol.lot_size_filter.qty_step,
      price: tickerData.last_price,
      minimumOrderSizeUSD: parseFloat(
        tickerData.last_price * filteredSymbol.lot_size_filter.qty_step
      ).toFixed(2),
      totalVolume: tickerData.total_volume,
    });
  });

  // sort ascending
  const sortedMergedData = mergedData.sort(
    (a, b) => a.minimumOrderSizeUSD - b.minimumOrderSizeUSD
  );

  converter.json2csv(sortedMergedData, (err, csv) => {
    if (err) throw err;
    fs.writeFileSync("bybit.csv", csv);
  });
};

start();
