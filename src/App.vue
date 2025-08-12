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
  if (changeNum > 0) return 'price-down'
  if (changeNum < 0) return 'price-up'
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
    <div class="header">
      <h1>STOCK ANALYSIS</h1>
      <div class="date">{{ date }}</div>
    </div>
    
    <div v-if="loading" class="loading">
      <div class="loading-spinner"></div>
      <div>Loading...</div>
    </div>
    
    <div v-else-if="error" class="error">
      {{ error }}
    </div>
    
    <div v-else class="content">
      <div class="filter-card">
        <div class="filter-section">
          <div class="filter-group">
            <label>Stock Code/Name</label>
            <input type="text" v-model="symbol_filter" placeholder="Enter stock code or name" />
          </div>
          <div class="filter-group">
            <label>Price Diff (%)</label>
            <input type="number" v-model="price_diff" placeholder="Enter price diff (%)"/>
          </div>
          <div class="filter-group">
            <label>Volume Diff (%)</label>
            <input type="number" v-model="trade_count_diff" placeholder="Enter volume diff (%)"/>
          </div>
        </div>
        
        <div class="button-section">
          <button class="btn btn-primary" @click="defaultFilter">
            Default Filter
          </button>
          <button class="btn btn-secondary" @click="filter">
            Filter
          </button>
          <button class="btn btn-outline" @click="reset">
            Reset
          </button>
        </div>
      </div>
      
      <div class="table-container">
        <div class="table-header">
          <div class="result-count">
            {{ display_stocks.length }} results
            <span v-if="display_stocks.length !== stocks.length" class="total-count">
              (of {{ stocks.length }} total)
            </span>
          </div>
        </div>
        <table>
          <thead>
            <tr>
              <th>Code</th>
              <th>Name</th>
              <th>Change (%)</th>
              <th>Close</th>
              <th>Prev Close</th>
              <th>Trade Count</th>
              <th>Prev Trade Count</th>
            </tr>
          </thead>
          <tbody>
            <tr v-for="stock in display_stocks" :key="stock.symbol">
              <td>{{ stock.symbol }}</td>
              <td>{{ stock.name }}</td>
              <td :class="getPriceChangeClass(calculatePriceChange(stock.close, stock.prev_close))">
                {{ calculatePriceChange(stock.close, stock.prev_close) ?? '-' }}
              </td>
              <td>{{ stock.close }}</td>
              <td>{{ stock.prev_close ?? '-' }}</td>
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
/* 全域樣式 - 深色主題 */
* {
  box-sizing: border-box;
}

body {
  overflow-x: hidden;
  max-width: 100vw;
  background: #000;
  color: #fff;
  font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
}

#app {
  min-height: 100vh;
  background: linear-gradient(135deg, #0a0a0a 0%, #1a1a1a 100%);
  padding: 1rem;
}

/* 標題區域 */
.header {
  text-align: center;
  margin-bottom: 2rem;
  padding: 1rem 0;
}

.header h1 {
  font-size: 2rem;
  font-weight: 700;
  margin: 0;
  background: linear-gradient(135deg, #fff 0%, #ccc 100%);
  -webkit-background-clip: text;
  -webkit-text-fill-color: transparent;
  background-clip: text;
}

.date {
  font-size: 0.9rem;
  color: #888;
  margin-top: 0.5rem;
}

/* 載入狀態 */
.loading {
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  padding: 3rem;
  color: #888;
}

.loading-spinner {
  width: 40px;
  height: 40px;
  border: 3px solid #333;
  border-top: 3px solid #fff;
  border-radius: 50%;
  animation: spin 1s linear infinite;
  margin-bottom: 1rem;
}

@keyframes spin {
  0% { transform: rotate(0deg); }
  100% { transform: rotate(360deg); }
}

/* 錯誤狀態 */
.error {
  background: rgba(255, 59, 48, 0.1);
  border: 1px solid rgba(255, 59, 48, 0.3);
  border-radius: 12px;
  padding: 1rem;
  color: #ff3b30;
  text-align: center;
}

/* 內容區域 */
.content {
  max-width: 1200px;
  margin: 0 auto;
}

/* 篩選卡片 */
.filter-card {
  background: rgba(255, 255, 255, 0.05);
  border-radius: 16px;
  padding: 1.5rem;
  margin-bottom: 2rem;
  backdrop-filter: blur(10px);
  border: 1px solid rgba(255, 255, 255, 0.1);
}

.filter-section {
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(200px, 1fr));
  gap: 1rem;
  margin-bottom: 1.5rem;
}

.filter-group {
  display: flex;
  flex-direction: column;
  gap: 0.5rem;
}

.filter-group label {
  font-size: 0.9rem;
  font-weight: 600;
  color: #ccc;
}

.filter-group input {
  padding: 0.75rem;
  border: 1px solid rgba(255, 255, 255, 0.2);
  border-radius: 8px;
  background: rgba(255, 255, 255, 0.05);
  color: #fff;
  font-size: 0.9rem;
  transition: all 0.2s ease;
}

.filter-group input::placeholder {
  color: #666;
}

.filter-group input:focus {
  outline: none;
  border-color: #007aff;
  background: rgba(255, 255, 255, 0.1);
  box-shadow: 0 0 0 3px rgba(0, 122, 255, 0.1);
}

/* 按鈕區域 */
.button-section {
  display: flex;
  gap: 0.75rem;
  flex-wrap: wrap;
  justify-content: center;
}

.btn {
  padding: 0.75rem 1.5rem;
  border: none;
  border-radius: 8px;
  font-size: 0.9rem;
  font-weight: 600;
  cursor: pointer;
  transition: all 0.2s ease;
  white-space: nowrap;
}

.btn-primary {
  background: linear-gradient(135deg, #007aff 0%, #0056b3 100%);
  color: white;
  box-shadow: 0 2px 8px rgba(0, 122, 255, 0.3);
}

.btn-primary:hover {
  transform: translateY(-1px);
  box-shadow: 0 4px 12px rgba(0, 122, 255, 0.4);
}

.btn-secondary {
  background: linear-gradient(135deg, #34c759 0%, #28a745 100%);
  color: white;
  box-shadow: 0 2px 8px rgba(52, 199, 89, 0.3);
}

.btn-secondary:hover {
  transform: translateY(-1px);
  box-shadow: 0 4px 12px rgba(52, 199, 89, 0.4);
}

.btn-outline {
  background: transparent;
  color: #fff;
  border: 1px solid rgba(255, 255, 255, 0.3);
}

.btn-outline:hover {
  background: rgba(255, 255, 255, 0.1);
  border-color: rgba(255, 255, 255, 0.5);
}

/* 表格容器 */
.table-container {
  background: rgba(255, 255, 255, 0.05);
  border-radius: 16px;
  overflow: hidden;
  backdrop-filter: blur(10px);
  border: 1px solid rgba(255, 255, 255, 0.1);
}

/* 表格標題區域 */
.table-header {
  padding: 1rem 1.5rem;
  border-bottom: 1px solid rgba(255, 255, 255, 0.1);
  background: rgba(255, 255, 255, 0.05);
}

.result-count {
  font-size: 0.9rem;
  color: #ccc;
  font-weight: 500;
}

.total-count {
  color: #888;
  font-size: 0.85rem;
}

table {
  width: 100%;
  border-collapse: collapse;
  font-size: 0.85rem;
}

thead {
  background: rgba(255, 255, 255, 0.1);
}

th {
  padding: 1rem 0.75rem;
  text-align: left;
  font-weight: 600;
  color: #ccc;
  border-bottom: 1px solid rgba(255, 255, 255, 0.1);
}

td {
  padding: 0.75rem;
  border-bottom: 1px solid rgba(255, 255, 255, 0.05);
  color: #fff;
}

tbody tr:hover {
  background: rgba(255, 255, 255, 0.05);
}

/* 漲跌顏色樣式 */
.price-up {
  color: #34c759;  /* 綠色 - 用於跌幅 */
  font-weight: 600;
}

.price-down {
  color: #ff3b30;  /* 紅色 - 用於漲幅 */
  font-weight: 600;
}

/* RWD 佈局 */
@media (max-width: 768px) {
  #app {
    padding: 0.5rem;
  }
  
  .header h1 {
    font-size: 1.5rem;
  }
  
  .filter-section {
    grid-template-columns: 1fr;
  }
  
  .button-section {
    flex-direction: column;
  }
  
  .btn {
    width: 100%;
  }
  
  .table-container {
    overflow-x: auto;
  }
  
  table {
    min-width: 600px;
    font-size: 0.8rem;
  }
  
  th, td {
    padding: 0.5rem;
  }
}

@media (max-width: 575px) {
  .filter-card {
    padding: 1rem;
  }
  
  .header {
    margin-bottom: 1rem;
  }
  
  .header h1 {
    font-size: 1.25rem;
  }
}
</style>
