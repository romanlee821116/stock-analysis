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
  <div>
    <h3>每日股票收盤價：{{ date }}</h3>
    <div v-if="loading">載入中...</div>
    <div v-else-if="error">{{ error }}</div>
    <div v-else>
      <div class="filter">
        <div>
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
        <div>
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
</template>

<style scoped>
table {
  border-collapse: collapse;
  width: 100%;
  margin-top: 2em;
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
  align-items: center;
  margin-bottom: 1em;
  padding: 1em;
  background: #f9f9f9;
  border-radius: 8px;
  color: #000;
}

.filter > div:first-child {
  display: flex;
  gap: 1em;
  flex-wrap: wrap;
}

.filter > div:first-child > div {
  display: flex;
  flex-direction: column;
  gap: 0.5em;
}

.filter input {
  padding: 0.5em;
  border: 1px solid #ddd;
  border-radius: 4px;
  min-width: 120px;
}

.filter button {
  padding: 0.5em 1em;
  margin: 0 0.25em;
  border: none;
  border-radius: 4px;
  background: #ccc;
  color: white;
  cursor: pointer;
}

.filter button:hover {
  background: #444;
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
