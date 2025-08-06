// Line Webhook 處理器 (ES6 版本)
import crypto from 'crypto'
import { fetchStocks } from './stocks.js'

// Line Bot 配置
const LINE_CONFIG = {
  // 新的 Channel Access Token
  CHANNEL_ACCESS_TOKEN: 'Y6UlXr1cVuInoUj3+yWEM1Bg93ua5BdjwYBxk8iB2TuTsNR2U33hsj/NvTl0efi7PEOWHEx//1KMIUitcCH/YW1q5LzdSbM6qiiR2u/jTp83GYl9ZaH+Fhxc2PHRcLHrJCBi/EtqxBSC7dTxI9n6wgdB04t89/1O/w1cDnyilFU=',
  CHANNEL_SECRET: 'e72bbd8d2180d2c8d6403924426fa019'
}

// 處理 Line Webhook 事件
export async function handleLineWebhook(body) {
  try {
    console.log('📥 收到 Line Webhook 請求')
    console.log('📋 請求內容:', JSON.stringify(body, null, 2))
    
    const { events } = body
    
    if (!events || events.length === 0) {
      console.log('⚠️ 沒有事件需要處理')
      return { status: 'no events' }
    }

    console.log(`📊 處理 ${events.length} 個事件`)
    const results = []
    
    for (const event of events) {
      console.log('🔄 處理事件:', event.type)
      const result = await processLineEvent(event)
      results.push(result)
    }

    console.log('✅ 所有事件處理完成')
    return { status: 'success', results }
  } catch (error) {
    console.error('❌ 處理 Line Webhook 失敗:', error)
    throw error
  }
}

// 處理單個 Line 事件
async function processLineEvent(event) {
  const { type, message, replyToken, source } = event

  console.log(`📝 事件類型: ${type}`)
  console.log(`👤 用戶ID: ${source.userId}`)

  // 只處理訊息事件
  if (type !== 'message') {
    console.log('⚠️ 忽略非訊息事件')
    return { status: 'ignored', reason: 'not a message event' }
  }

  // 檢查是否為文字訊息
  if (message.type !== 'text') {
    console.log('⚠️ 忽略非文字訊息')
    return { status: 'ignored', reason: 'not a text message' }
  }

  const userMessage = message.text.trim()
  const userId = source.userId

  console.log(`💬 用戶訊息: "${userMessage}"`)
  console.log(`🆔 用戶ID: ${userId}`)

  // 檢查是否為推薦標的的關鍵字
  if (isRecommendationRequest(userMessage)) {
    console.log('🎯 檢測到推薦標的請求')
    return await handleRecommendationRequest(replyToken, userId)
  }

  console.log('❓ 不是推薦標的請求，回覆測試訊息')
  // 回覆測試訊息
  await replyLineMessage(replyToken, `收到您的訊息：「${userMessage}」\n這是一個測試回覆！`)
  
  return { status: 'test_reply', message: userMessage }
}

// 檢查是否為推薦標的請求
function isRecommendationRequest(message) {
  const keywords = [
    '推薦標的',
    '推薦股票',
    '熱門股票',
    '今日推薦',
    '股票推薦',
    '推薦',
    '標的'
  ]
  
  return keywords.some(keyword => 
    message.includes(keyword) || message.toLowerCase().includes(keyword.toLowerCase())
  )
}

// 處理推薦標的請求
async function handleRecommendationRequest(replyToken, userId) {
  try {
    // 取得股票資料
    let allStocks
    try {
      allStocks = await fetchStocks()
      console.log(`✅ 成功取得 ${allStocks.length} 筆股票資料`)
    } catch (error) {
      console.error('❌ 取得股票資料失敗:', error)
      console.log('⚠️ 使用模擬資料作為備用')
      allStocks = []
    }
    
    // 套用預設篩選條件
    const filteredStocks = applyDefaultFilter(allStocks)
    
    // 格式化訊息
    const message = formatStocksForLine(filteredStocks, '預設篩選條件：價格漲幅 > 4.5%, 交易量增長 > 50%')
    
    // 回覆訊息
    await replyLineMessage(replyToken, message)
    
    return { 
      status: 'success', 
      action: 'recommendation_sent',
      stockCount: filteredStocks.length 
    }
  } catch (error) {
    console.error('處理推薦標的請求失敗:', error)
    
    // 回覆錯誤訊息
    const errorMessage = '抱歉，目前無法取得股票推薦資料，請稍後再試。'
    await replyLineMessage(replyToken, errorMessage)
    
    return { 
      status: 'error', 
      action: 'error_reply',
      error: error.message 
    }
  }
}

// 套用預設篩選條件
function applyDefaultFilter(stocks) {
  return stocks.filter(stock => {
    // 計算價格漲跌幅
    const priceChange = calculatePriceChange(stock.close, stock.prev_close)
    if (!priceChange) return false
    
    // 計算交易量變化
    const tradeCountChange = calculateTradeCountChange(stock.trade_count, stock.prev_trade_count)
    if (!tradeCountChange) return false
    
    // 預設篩選條件：價格漲幅 > 4.5% 且 交易量增長 > 50%
    return parseFloat(priceChange) > 4.5 && tradeCountChange > 50
  })
}

// 計算價格漲跌幅
function calculatePriceChange(current, previous) {
  if (!current || !previous) return null
  const currentNum = Number(current.toString().replace(/,/g, ''))
  const previousNum = Number(previous.toString().replace(/,/g, ''))
  if (previousNum === 0) return null
  return ((currentNum - previousNum) / previousNum * 100).toFixed(2)
}

// 計算交易量變化
function calculateTradeCountChange(current, previous) {
  if (!current || !previous) return null
  const currentNum = Number(current.toString().replace(/,/g, ''))
  const previousNum = Number(previous.toString().replace(/,/g, ''))
  if (previousNum === 0) return null
  return ((currentNum - previousNum) / previousNum * 100).toFixed(2)
}

// 格式化股票資料為 Line 訊息
function formatStocksForLine(stocks, filterInfo = '') {
  if (!stocks || stocks.length === 0) {
    return '沒有找到符合條件的股票'
  }

  let message = `📊 股票篩選結果\n`
  if (filterInfo) {
    message += `🔍 篩選條件: ${filterInfo}\n`
  }
  message += `📅 資料日期: ${new Date().toLocaleDateString('zh-TW')}\n`
  message += `📈 符合條件的股票數量: ${stocks.length}\n\n`
  
  stocks.forEach((stock, index) => {
    const priceChange = calculatePriceChange(stock.close, stock.prev_close)
    const changeIcon = priceChange > 0 ? '📈' : priceChange < 0 ? '📉' : '➡️'
    
    message += `${index + 1}. ${stock.symbol} ${stock.name}\n`
    message += `   收盤價: ${stock.close} (${changeIcon} ${priceChange}%)\n\n`
  })

  return message
}

// 回覆 Line 訊息
async function replyLineMessage(replyToken, message) {
  try {
    console.log('📤 準備發送回覆...')
    console.log('🔑 使用 Token:', LINE_CONFIG.CHANNEL_ACCESS_TOKEN.substring(0, 20) + '...')
    console.log('🆔 Reply Token:', replyToken)
    console.log('💬 訊息內容:', message)
    
    const requestBody = {
      replyToken: replyToken,
      messages: [
        {
          type: 'text',
          text: message
        }
      ]
    }
    
    console.log('📋 請求內容:', JSON.stringify(requestBody, null, 2))
    
    const response = await fetch('https://api.line.me/v2/bot/message/reply', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${LINE_CONFIG.CHANNEL_ACCESS_TOKEN}`
      },
      body: JSON.stringify(requestBody)
    })

    console.log('📡 回應狀態:', response.status)
    console.log('📡 回應標頭:', Object.fromEntries(response.headers.entries()))

    if (!response.ok) {
      const errorText = await response.text()
      console.error('❌ Line API 錯誤回應:', errorText)
      throw new Error(`Line API 錯誤: ${response.status} - ${errorText}`)
    }

    const result = await response.json()
    console.log('✅ 回覆成功:', result)
    return result
  } catch (error) {
    console.error('❌ 回覆 Line 訊息失敗:', error)
    throw error
  }
} 