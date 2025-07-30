<script setup>
import { ref, onMounted } from 'vue'

const stocks = ref([]);
const display_stocks = ref([]);
const loading = ref(true)
const error = ref('')
const date = new Date().toLocaleDateString('zh-TW', { year: 'numeric', month: '2-digit', day: '2-digit' })
const price_diff = ref(null)
const trade_count_diff = ref(null)
const toNumber = data => {
  if (data) {
    return Number(data.replace(/,/g, ''))
  }

}
const filter = () => {
  const pattern = /^\d+(\.\d+)?$/
  if (!price_diff.value.test(pattern) || !trade_count_diff.value.test(pattern)) {
    return
  }
  if (price_diff.value && !trade_count_diff.value) {
    display_stocks.value = stocks.value.filter(stock => (stock.close - stock.prev_close) / stock.prev_close * 100 > price_diff.value);
  }
  if (!price_diff.value && trade_count_diff.value) {
    display_stocks.value = stocks.value.filter(stock => {
      console.log(toNumber(stock.trade_count), toNumber(stock.prev_trade_count), (toNumber(stock.trade_count) - toNumber(stock.prev_trade_count)) / toNumber(stock.prev_trade_count) * 100 > trade_count_diff.value);
      return (toNumber(stock.trade_count) - toNumber(stock.prev_trade_count)) / toNumber(stock.prev_trade_count) * 100 > trade_count_diff.value
    });
  }
  if (price_diff.value && trade_count_diff.value) {
    display_stocks.value = stocks.value.filter(stock => {
      const price_diff_ratio = (stock.close - stock.prev_close) / stock.prev_close * 100
      const trade_count_diff_ratio = (toNumber(stock.trade_count) - toNumber(stock.prev_trade_count)) / toNumber(stock.prev_trade_count) * 100
      return price_diff_ratio > price_diff.value && trade_count_diff_ratio > trade_count_diff.value
    });
  }
}
const reset = () => {
  display_stocks.value = stocks.value
  trade_count_diff.value = null
  price_diff.value = null
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
    const res = await fetch('http://localhost:8000/backend/get_stocks.php')
    if (!res.ok) {
      throw new Error('API 請求失敗')
    }
    const data = await res.json()
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
            收盤價差(%)
            <input type="number" v-model="price_diff" />
          </div>
          <div>
            交易量差(%)
            <input type="number" v-model="trade_count_diff" />
          </div>
        </div>
        <div>
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
}
</style>
