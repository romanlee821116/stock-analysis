<script setup>
import { ref, onMounted, watch } from 'vue'
import { fetchStocks } from './api/stocks.js'

const stocks = ref([]);
const display_stocks = ref([]);
const loading = ref(true)
const error = ref('')
const date = new Date().toLocaleDateString('zh-TW', { year: 'numeric', month: '2-digit', day: '2-digit' })
const price_diff = ref(null)
const trade_count_diff = ref(null)
const symbol_filter = ref('')
// 監聽股票代號篩選的變化
watch(symbol_filter, () => {
  filter()
})
const toNumber = data => {
  if (data) {
    return Number(data.replace(/,/g, ''))
  }
}

// 計算漲跌幅
const calculatePriceChange = (current, previous) => {
  if (!current || !previous) return null
  const currentNum = toNumber(current)
  const previousNum = toNumber(previous)
  if (previousNum === 0) return null
  return ((currentNum - previousNum) / previousNum * 100).toFixed(2)
}

// 取得漲跌幅的 CSS 類別
const getPriceChangeClass = (change) => {
  if (!change) return ''
  const changeNum = parseFloat(change)
  if (changeNum > 0) return 'price-up'
  if (changeNum < 0) return 'price-down'
  return ''
}
const filter = () => {
  const pattern = /^\d+(\.\d+)?$/
  // 檢查是否為有效數字
  if (price_diff.value && isNaN(price_diff.value)) {
    return
  }
  if (trade_count_diff.value && isNaN(trade_count_diff.value)) {
    return
  }
  
  // 先根據股票代號篩選
  let filteredStocks = stocks.value
  if (symbol_filter.value.trim()) {
    filteredStocks = stocks.value.filter(stock => 
      stock.symbol.includes(symbol_filter.value.trim()) || 
      stock.name.includes(symbol_filter.value.trim())
    )
  }
  
  // 再根據價格和交易量篩選
  if (price_diff.value && !trade_count_diff.value) {
    filteredStocks = filteredStocks.filter(stock => {
      const priceChange = calculatePriceChange(stock.close, stock.prev_close)
      return priceChange && parseFloat(priceChange) > price_diff.value
    });
  }
  if (!price_diff.value && trade_count_diff.value) {
    filteredStocks = filteredStocks.filter(stock => {
      const tradeCountChange = (toNumber(stock.trade_count) - toNumber(stock.prev_trade_count)) / toNumber(stock.prev_trade_count) * 100
      return tradeCountChange > trade_count_diff.value
    });
  }
  if (price_diff.value && trade_count_diff.value) {
    filteredStocks = filteredStocks.filter(stock => {
      const priceChange = calculatePriceChange(stock.close, stock.prev_close)
      const tradeCountChange = (toNumber(stock.trade_count) - toNumber(stock.prev_trade_count)) / toNumber(stock.prev_trade_count) * 100
      return priceChange && parseFloat(priceChange) > price_diff.value && tradeCountChange > trade_count_diff.value
    });
  }
  
  display_stocks.value = filteredStocks
}
const defaultFilter = () => {
  price_diff.value = 4.5
  trade_count_diff.value = 50
  filter()
}
const reset = () => {
  display_stocks.value = stocks.value
  trade_count_diff.value = null
  price_diff.value = null
  symbol_filter.value = ''
};


onMounted(async () => {
  try {
    if (window.sessionStorage.getItem('stocks')) {
      const data = JSON.parse(window.sessionStorage.getItem('stocks'))
      if (data.date === date) {
        stocks.value = data.stocks
        display_stocks.value = stocks.value
        return
      }
    }
    const data = await fetchStocks()
    window.sessionStorage.setItem('stocks', JSON.stringify({
      date: date,
      stocks: data
    }))
    stocks.value = data
    display_stocks.value = stocks.value
  } catch (e) {
    error.value = e.message
  } finally {
    loading.value = false
  }
})
</script>

<template>
  <div id="app">
    <h3>每日股票收盤價：{{ date }}</h3>
    <div v-if="loading">載入中...</div>
    <div v-else-if="error">{{ error }}</div>
    <div v-else>
      <div class="filter">
        <div class="filter-inputs">
          <div>
            股票代號/名稱
            <input type="text" v-model="symbol_filter" placeholder="輸入股票代號或名稱" />
          </div>
          <div>
            收盤價差(%)
            <input type="number" v-model="price_diff" />
          </div>
          <div>
            交易量差(%)
            <input type="number" v-model="trade_count_diff" />
          </div>
        </div>
        <div class="filter-buttons">
          <button @click="defaultFilter">
            預設篩選
          </button>
          <button @click="filter">
            篩選
          </button>
          <button @click="reset">
            重置
          </button>
        </div>
      </div>
      <div class="table-container">
        <table>
          <thead>
            <tr>
              <!-- <th>日期</th> -->
              <th>股票代號</th>
              <th>名稱</th>
              <th>收盤價</th>
              <th>昨日收盤價</th>
              <th>漲跌幅(%)</th>
              <th>當日成交筆數</th>
              <th>昨日成交筆數</th>
            </tr>
          </thead>
          <tbody>
            <tr v-for="stock in display_stocks" :key="stock.symbol">
              <!-- <td>{{ stock.date }}</td> -->
              <td>{{ stock.symbol }}</td>
              <td>{{ stock.name }}</td>
              <td>{{ stock.close }}</td>
              <td>{{ stock.prev_close ?? '-' }}</td>
              <td :class="getPriceChangeClass(calculatePriceChange(stock.close, stock.prev_close))">
                {{ calculatePriceChange(stock.close, stock.prev_close) ?? '-' }}
              </td>
              <td>{{ stock.trade_count ?? '-' }}</td>
              <td>{{ stock.prev_trade_count ?? '-' }}</td>
            </tr>
          </tbody>
        </table>
      </div>
    </div>
  </div>
</template>

<style scoped>
/* 全域樣式 - 防止水平滾動 */
* {
  box-sizing: border-box;
}

body {
  overflow-x: hidden;
  max-width: 100vw;
}

#app {
  overflow-x: hidden;
  padding: 0;
}

/* 確保主要容器不會超出螢幕 */
div {
  max-width: 100%;
  overflow-x: hidden;
}

table {
  border-collapse: collapse;
  width: 100%;
  margin-top: 2em;
  max-width: 100%;
}

/* 表格容器 - 允許水平滾動 */
.table-container {
  width: 100%;
  overflow-x: auto;
  margin-top: 2em;
}

/* 表格本身 - 設定最小寬度確保內容完整顯示 */
table {
  min-width: 800px; /* 確保所有欄位都能顯示 */
  width: 100%;
  border-collapse: collapse;
  margin-top: 0;
}
thead {
  color: #000;
}
th, td {
  border: 1px solid #ccc;
  padding: 0.5em 1em;
  text-align: center;
}
th {
  background: #f5f5f5;
}
.filter {
  display: flex;
  justify-content: space-between;
  align-items: flex-start;
  margin-bottom: 1em;
  padding: 1em;
  background: #f9f9f9;
  border-radius: 8px;
  color: #000;
  gap: 1em;
}

.filter-inputs {
  display: flex;
  gap: 1em;
  flex-wrap: wrap;
  flex: 1;
}

.filter-inputs > div {
  display: flex;
  flex-direction: column;
  gap: 0.5em;
  min-width: 150px;
}

.filter-buttons {
  display: flex;
  gap: 0.5em;
  flex-wrap: wrap;
  align-items: flex-start;
}

.filter input {
  padding: 0.5em;
  border: 1px solid #ddd;
  border-radius: 4px;
  min-width: 120px;
}

.filter button {
  padding: 0.5em 1em;
  border: none;
  border-radius: 4px;
  background: #ccc;
  color: white;
  cursor: pointer;
  white-space: nowrap;
}

.filter button:hover {
  background: #444;
}

/* RWD 佈局 - 螢幕寬度小於 575px */
@media (max-width: 575px) {
  .filter {
    flex-direction: column;
    align-items: stretch;
    width: 100%;
    box-sizing: border-box;
  }
  
  .filter-inputs {
    order: 1;
    margin-bottom: 1em;
    width: 100%;
  }
  
  .filter-buttons {
    order: 2;
    justify-content: center;
    width: 100%;
  }
  
  .filter-inputs > div {
    min-width: 100%;
    width: 100%;
  }
  
  .filter input {
    min-width: 100%;
    width: 100%;
    box-sizing: border-box;
  }
  
  /* 表格容器在小螢幕時的處理 */
  .table-container {
    width: 100%;
    overflow-x: auto;
    margin-top: 1em;
    border-radius: 4px;
    box-shadow: 0 2px 4px rgba(0,0,0,0.1);
  }
  
  /* 表格在小螢幕時的處理 */
  table {
    min-width: 600px; /* 小螢幕時的最小寬度 */
    width: 100%;
    font-size: 0.8em;
    margin-top: 0;
  }
  
  /* 表格內容在小螢幕時的處理 */
  th, td {
    min-width: 50px;
    max-width: 100px;
    word-wrap: break-word;
    overflow-wrap: break-word;
    padding: 0.3em 0.5em;
    font-size: 0.9em;
  }
  
  /* 確保整個頁面不會水平滾動 */
  body {
    overflow-x: hidden;
  }
  
  /* 確保容器不會超出螢幕 */
  div {
    max-width: 100vw;
    box-sizing: border-box;
  }
  
  /* 標題在小螢幕上的處理 */
  h3 {
    font-size: 1.2em;
    margin: 0.5em 0;
  }
}

/* 漲跌顏色樣式 */
.price-up {
  color: #ff4444;
  font-weight: bold;
}

.price-down {
  color: #44aa44;
  font-weight: bold;
}

/* 漲跌幅欄位特殊樣式 */
td:nth-child(5) {
  font-weight: bold;
}

/* Line 按鈕樣式 */
.line-button {
  background: #00c300 !important;
  color: white !important;
}

.line-button:hover {
  background: #009900 !important;
}

.line-button:disabled {
  background: #ccc !important;
  cursor: not-allowed;
}

/* Line 訊息樣式 */
.line-message {
  margin: 1em 0;
  padding: 0.75em;
  border-radius: 4px;
  background: #f0f8ff;
  border-left: 4px solid #00c300;
  color: #333;
  white-space: pre-wrap;
  font-family: monospace;
  max-height: 300px;
  overflow-y: auto;
}

/* 測試按鈕樣式 */
.test-button {
  background: #ff9500 !important;
  color: white !important;
}

.test-button:hover {
  background: #e6850e !important;
}

/* 說明按鈕樣式 */
.help-button {
  background: #007aff !important;
  color: white !important;
}

.help-button:hover {
  background: #0056b3 !important;
}
</style>
