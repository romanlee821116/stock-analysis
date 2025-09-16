import express from 'express'
import cors from 'cors'
import crypto from 'crypto'
import dotenv from 'dotenv'
import { handleLineWebhook } from './src/api/webhook.mjs'
import path from 'path'
import { fileURLToPath } from 'url'

// 載入環境變數
dotenv.config()

const __filename = fileURLToPath(import.meta.url)
const __dirname = path.dirname(__filename)

const app = express()
const PORT = process.env.PORT || 3000

// 中間件
app.use(cors({
  origin: [
    'http://localhost:5173',
    'https://localhost:5173',
    'https://e38c09053a7d.ngrok-free.app',
    'https://*.ngrok-free.app',
    'https://*.ngrok.io'
  ],
  credentials: true
}))
app.use(express.json())

// 靜態檔案服務（前端建置檔案）
app.use(express.static(path.join(__dirname, 'dist')))

// 驗證 Line Webhook 簽名
function verifyLineSignature(body, signature) {
  const channelSecret = process.env.LINE_CHANNEL_SECRET
  if (!channelSecret) {
    throw new Error('LINE_CHANNEL_SECRET 環境變數未設定')
  }
  const hash = crypto.createHmac('SHA256', channelSecret)
    .update(body, 'utf8')
    .digest('base64')
  
  return signature === hash
}

// Line Webhook 端點
app.post('/webhook/line', async (req, res) => {
  try {
    console.log('🌐 收到 POST 請求到 /webhook/line')
    console.log('📋 請求標頭:', req.headers)
    
    // 驗證簽名
    const signature = req.headers['x-line-signature']
    const body = JSON.stringify(req.body)
    
    console.log('🔐 簽名驗證中...')
    if (!verifyLineSignature(body, signature)) {
      console.log('❌ 簽名驗證失敗')
      console.log('收到的簽名:', signature)
      return res.status(401).json({ error: 'Unauthorized' })
    }
    
    console.log('✅ 簽名驗證成功')

    // 處理 Webhook 事件
    const result = await handleLineWebhook(req.body)
    
    console.log('📊 Webhook 處理結果:', result)
    res.json({ status: 'success' })
  } catch (error) {
    console.error('❌ Webhook 處理錯誤:', error)
    res.status(500).json({ error: 'Internal Server Error' })
  }
})

// 根路徑端點
app.get('/', (req, res) => {
  res.json({
    message: '🚀 Stock Analysis LINE Bot 伺服器運行中',
    status: 'active',
    timestamp: new Date().toISOString(),
    endpoints: {
      webhook: '/webhook/line',
      health: '/health',
      testToken: '/test-token'
    },
    info: {
      service: 'LINE Bot Webhook Server',
      version: '1.0.0',
      description: '股票分析 LINE Bot 服務'
    }
  })
})

// 健康檢查端點
app.get('/health', (req, res) => {
  res.json({ status: 'ok', timestamp: new Date().toISOString() })
})

// Token 測試端點
app.get('/test-token', async (req, res) => {
  try {
    const { testChannelAccessToken } = await import('./src/utils/testToken.js')
    const result = await testChannelAccessToken()
    res.json(result)
  } catch (error) {
    console.error('Token 測試錯誤:', error)
    res.status(500).json({ valid: false, error: error.message })
  }
})

// 前端路由處理（SPA 支援）
app.get('*', (req, res) => {
  // 如果是 API 路由，不處理
  if (req.path.startsWith('/webhook') || req.path.startsWith('/health') || req.path.startsWith('/test-token')) {
    return res.status(404).json({ error: 'Not Found' })
  }
  
  // 回傳前端 index.html
  res.sendFile(path.join(__dirname, 'dist', 'index.html'))
})

// 啟動伺服器
app.listen(PORT, () => {
  console.log(`🚀 Line Bot Webhook 伺服器運行在 http://localhost:${PORT}`)
  console.log(`📱 Webhook URL: http://localhost:${PORT}/webhook/line`)
  console.log(`💚 健康檢查: http://localhost:${PORT}/health`)
  console.log(`🌐 前端網址: http://localhost:${PORT}`)
})

export default app 