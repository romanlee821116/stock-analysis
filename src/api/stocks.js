// 股票資料 API

// 檢查快取是否有效（一天內）
function isCacheValid(stockCache) {
  return stockCache.dateDetail?.today === formatDate(new Date())
}

export async function fetchStocks() {
  try {
    const stockCache = JSON.parse(window.sessionStorage.getItem('stocks')) || {}
    // 檢查快取是否有效
    if (isCacheValid(stockCache)) {
      console.log(`✅ 快取有效，使用快取資料${formatDate(new Date())}`);
      return stockCache
    }

    console.log('❌ 快取無效或不存在，重新取得資料');
    
    // 取得台灣時間（UTC+8）
    const now = new Date();
    const taiwanTime = new Date(now.getTime() + (8 * 60 * 60 * 1000)); // 轉換為台灣時間
    const currentHour = taiwanTime.getUTCHours();
    const currentMinute = taiwanTime.getUTCMinutes();
    
    // 判斷是否在 15:00 前（證交所資料發布時間）
    const isBeforeDataRelease = currentHour < 15;
    
    // 計算要查詢的日期（使用台灣日期）
    let today = new Date(taiwanTime);
    let yesterday = new Date(today);
    
    if (isBeforeDataRelease) {
      // 15:00 前，查詢前一天的資料
      today = getPreviousTradingDay(today);
      yesterday = getPreviousTradingDay(today);
      
      // 提醒用戶現在取得的是前一天的資料
      console.log(`現在時間 ${currentHour}:${currentMinute.toString().padStart(2, '0')}，證交所資料尚未發布，取得 ${today.toISOString().slice(0, 10)} 的資料`);
    } else {
      // 14:00 後，查詢當天資料
      yesterday = getPreviousTradingDay(today);
    }

    // 1. 先嘗試取得 today 資料，如果沒有則往前扣到有資料為止
    const actualTodayDate = await fetchDataWithFallback(formatDate(today), 'today');    
    // 2. 從 actualTodayDate 往前扣一天取得 yesterday 資料
    const actualYesterdayDate = await fetchDataWithFallback(
      getPreviousTradingDay(new Date(actualTodayDate.slice(0,4) + '-' + actualTodayDate.slice(4,6) + '-' + actualTodayDate.slice(6,8))), 
      'yesterday'
    );
    
    // 3. 取得實際的股票資料
    const [todayStocks, yesterdayStocks] = await Promise.all([
      fetchTWSEData(actualTodayDate),
      fetchTWSEData(actualYesterdayDate)
    ]);    
    // 合併資料
    const stocks = mergeStockData(todayStocks, yesterdayStocks, actualTodayDate);

     // 更新快取
    const cacheData = {
      data: stocks,
      isYesterdayData: isBeforeDataRelease,
      date: actualTodayDate,
      dateDetail: {
        today: actualTodayDate,
        yesterday: actualYesterdayDate
      },
      timestamp: new Date().toISOString()
    };
    window.sessionStorage.setItem('stocks', JSON.stringify(cacheData));
    
    return cacheData;
    
  } catch (error) {
    console.error('❌ 取得股票資料時發生錯誤:', error);
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

// 抓取 TWSE CSV & 轉換
async function fetchTWSEData(date) {
  const url = `https://www.twse.com.tw/exchangeReport/MI_INDEX?response=csv&date=${date}&type=ALLBUT0999`;
  const res = await fetch(url);
  if (!res.ok) return {};

  const buffer = await res.arrayBuffer();
  const text = new TextDecoder('big5').decode(buffer);

  const data = parseCSV(text);
  return data && Object.keys(data).length > 0 ? data : {};
}

// 帶 fallback 的資料獲取函數
async function fetchDataWithFallback(startDate, type) {
  const maxRetries = 10; // 最多往前推10天
  let currentDate = startDate;
  let attempt = 0;
  
  // 如果是 Date 物件，轉換為字串格式
  if (currentDate instanceof Date) {
    currentDate = formatDate(currentDate);
  }
  
  console.log(`🔍 開始尋找 ${type} 資料，起始日期: ${currentDate}`);
  
  while (attempt < maxRetries) {
    console.log(`📅 嘗試取得 ${type} 資料 (第${attempt + 1}次): ${currentDate}`);
    
    const data = await fetchTWSEData(currentDate);
    
    if (Object.keys(data).length > 0) {
      console.log(`✅ 成功取得 ${type} 資料: ${currentDate} (${Object.keys(data).length} 筆)`);
      return currentDate;
    }
    
    console.warn(`⚠️ ${currentDate} 無 ${type} 資料，往前推一天重試`);
    
    // 往前推一天
    attempt++;
    currentDate = getPreviousTradingDayString(currentDate);
  }
  
  throw new Error(`連續 ${maxRetries} 天無法取得 ${type} 資料，可能連續停市`);
}

// 取得前一個交易日（字串版本）
function getPreviousTradingDayString(dateString) {
  const y = dateString.slice(0, 4);
  const m = dateString.slice(4, 6);
  const d = dateString.slice(6, 8);
  const date = new Date(`${y}-${m}-${d}`);
  
  // 往前推一天
  date.setDate(date.getDate() - 1);
  
  // 跳過週末
  while (date.getDay() === 0 || date.getDay() === 6) {
    date.setDate(date.getDate() - 1);
  }
  
  return formatDate(date);
}

// 格式化日期為 YYYYMMDD
function formatDate(date) {
  return date.toISOString().slice(0, 10).replace(/-/g, '');
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

// 取得前一個交易日（跳過週末）
function getPreviousTradingDay(date) {
  const result = new Date(date);
  result.setDate(result.getDate() - 1);
  
  // 如果是週日 (0) 或週六 (6)，再往前推一天
  while (result.getDay() === 0 || result.getDay() === 6) {
    result.setDate(result.getDate() - 1);
  }
  
  return result;
}