// 股票資料 API

// 快取機制
let stockCache = {
  data: null,
  date: null,
  timestamp: null
};

// 檢查快取是否有效（一天內）
function isCacheValid() {
  if (!stockCache.data || !stockCache.timestamp) {
    return false;
  }
  
  const now = new Date();
  const cacheTime = new Date(stockCache.timestamp);
  const oneDayInMs = 24 * 60 * 60 * 1000; // 24小時的毫秒數
  
  return (now - cacheTime) < oneDayInMs;
}

export async function fetchStocks() {
  try {
    // 檢查快取是否有效
    if (isCacheValid()) {
      console.log('使用快取的股票資料');
      return stockCache.data;
    }
    
    // 取得現在時間
    const now = new Date();
    const currentHour = now.getHours();
    const currentMinute = now.getMinutes();
    
    // 判斷是否在 14:00 前（證交所資料發布時間）
    const isBeforeDataRelease = currentHour < 14;
    
    // 計算要查詢的日期
    let today = new Date();
    let yesterday = new Date(today);
    
    if (isBeforeDataRelease) {
      // 14:00 前，查詢前一天的資料
      today.setDate(today.getDate() - 1);
      yesterday.setDate(yesterday.getDate() - 2);
      
      // 提醒用戶現在取得的是前一天的資料
      window.alert(`現在時間 ${currentHour}:${currentMinute.toString().padStart(2, '0')}，證交所資料尚未發布，取得 ${today.toISOString().slice(0, 10)} 的資料`);
    } else {
      // 14:00 後，查詢當天資料
      yesterday.setDate(yesterday.getDate() - 1);
    }
    
    const date = today.toISOString().slice(0, 10).replace(/-/g, '');
    const yesterdayDate = yesterday.toISOString().slice(0, 10).replace(/-/g, '');
    
    // 檢查快取中的資料是否為相同日期
    if (stockCache.date === date) {
      console.log('快取中的資料日期相同，直接使用快取');
      return stockCache.data;
    }
    
    // const corsProxy = 'https://cors-anywhere.herokuapp.com/';
    const baseUrl = 'https://www.twse.com.tw/exchangeReport/MI_INDEX';
    
    // 取得今日資料
    const todayUrl = `${baseUrl}?response=csv&date=${date}&type=ALLBUT0999`;
    const yesterdayUrl = `${baseUrl}?response=csv&date=${yesterdayDate}&type=ALLBUT0999`;
    
    console.log('正在從證交所取得最新股票資料...');
    
    // 使用 fetch 取得資料
    const [todayResponse, yesterdayResponse] = await Promise.all([
      fetch(todayUrl),
      fetch(yesterdayUrl)
    ]);
    
    if (!todayResponse.ok || !yesterdayResponse.ok) {
      throw new Error('無法取得股票資料');
    }
    
    const todayBuffer = await todayResponse.arrayBuffer();
    const yesterdayBuffer = await yesterdayResponse.arrayBuffer();
    
    // 將 Big5 編碼轉換為 UTF-8
    const todayText = new TextDecoder('big5').decode(todayBuffer);
    const yesterdayText = new TextDecoder('big5').decode(yesterdayBuffer);
    
    // 解析 CSV 資料
    const todayStocks = parseCSV(todayText);
    const yesterdayStocks = parseCSV(yesterdayText);
    
    // 合併資料
    const stocks = mergeStockData(todayStocks, yesterdayStocks, date);
    
    // 如果是在 14:00 前取得的資料，在回傳資料中加入提醒
    if (isBeforeDataRelease) {
      stocks.metadata = {
        isYesterdayData: true,
        message: `現在時間 ${currentHour}:${currentMinute.toString().padStart(2, '0')}，證交所資料尚未發布，此為 ${today.toISOString().slice(0, 10)} 的資料`,
        dataDate: today.toISOString().slice(0, 10)
      };
    } else {
      stocks.metadata = {
        isYesterdayData: false,
        message: `取得 ${today.toISOString().slice(0, 10)} 的最新資料`,
        dataDate: today.toISOString().slice(0, 10)
      };
    }
    
    // 更新快取
    stockCache = {
      data: stocks,
      date: date,
      timestamp: new Date().toISOString()
    };
    
    console.log('股票資料已更新並快取');
    
    return stocks;
  } catch (error) {
    console.error('取得股票資料時發生錯誤:', error);
    throw error;
  }
}

// 解析 CSV 資料
function parseCSV(csvText) {
  const stocks = {};
  const lines = csvText.split('\n');
  
  for (const line of lines) {
    // 匹配股票代號行（格式：="1234"）
    if (/^=?"\d{4,6}"/.test(line)) {
      const fields = parseCSVLine(line);
      if (fields.length >= 9) {
        const symbol = fields[0].replace(/[="]/g, '');
        stocks[symbol] = {
          symbol: symbol,
          name: fields[1].replace(/"/g, ''),
          close: fields[8].replace(/"/g, ''),
          trade_count: fields[2].replace(/"/g, '')
        };
      }
    }
  }
  
  return stocks;
}

// 解析 CSV 行
function parseCSVLine(line) {
  const fields = [];
  let current = '';
  let inQuotes = false;
  
  for (let i = 0; i < line.length; i++) {
    const char = line[i];
    
    if (char === '"') {
      inQuotes = !inQuotes;
    } else if (char === ',' && !inQuotes) {
      fields.push(current);
      current = '';
    } else {
      current += char;
    }
  }
  
  fields.push(current);
  return fields;
}

// 合併今日與昨日資料
function mergeStockData(todayStocks, yesterdayStocks, date) {
  const stocks = [];
  
  for (const symbol in todayStocks) {
    const todayInfo = todayStocks[symbol];
    const yesterdayInfo = yesterdayStocks[symbol];
    
    stocks.push({
      date: date,
      symbol: todayInfo.symbol,
      name: todayInfo.name,
      close: todayInfo.close,
      trade_count: todayInfo.trade_count,
      prev_close: yesterdayInfo ? yesterdayInfo.close : null,
      prev_trade_count: yesterdayInfo ? yesterdayInfo.trade_count : null
    });
  }
  
  return stocks;
} 