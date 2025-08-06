// 測試 Line Bot Token 的工具
import { LINE_CONFIG } from '../config/linebot.js'

// 測試 Channel Access Token
export async function testChannelAccessToken() {
  try {
    console.log('🔍 測試 Channel Access Token...')
    console.log('🔑 Token 前20字元:', LINE_CONFIG.CHANNEL_ACCESS_TOKEN.substring(0, 20) + '...')
    
    // 測試取得 Bot 資訊
    const response = await fetch('https://api.line.me/v2/bot/info', {
      headers: {
        'Authorization': `Bearer ${LINE_CONFIG.CHANNEL_ACCESS_TOKEN}`
      }
    })
    
    console.log('📡 回應狀態:', response.status)
    
    if (response.ok) {
      const botInfo = await response.json()
      console.log('✅ Token 有效！Bot 資訊:', botInfo)
      return { valid: true, botInfo }
    } else {
      const errorText = await response.text()
      console.log('❌ Token 無效！錯誤:', errorText)
      return { valid: false, error: errorText }
    }
  } catch (error) {
    console.error('❌ 測試 Token 時發生錯誤:', error)
    return { valid: false, error: error.message }
  }
}

// 測試發送訊息（需要 User ID）
export async function testSendMessage(userId, message = '測試訊息') {
  try {
    console.log('📤 測試發送訊息...')
    console.log('👤 目標用戶:', userId)
    console.log('💬 訊息:', message)
    
    const response = await fetch('https://api.line.me/v2/bot/message/push', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${LINE_CONFIG.CHANNEL_ACCESS_TOKEN}`
      },
      body: JSON.stringify({
        to: userId,
        messages: [
          {
            type: 'text',
            text: message
          }
        ]
      })
    })
    
    console.log('📡 回應狀態:', response.status)
    
    if (response.ok) {
      const result = await response.json()
      console.log('✅ 訊息發送成功！', result)
      return { success: true, result }
    } else {
      const errorText = await response.text()
      console.log('❌ 訊息發送失敗！錯誤:', errorText)
      return { success: false, error: errorText }
    }
  } catch (error) {
    console.error('❌ 測試發送訊息時發生錯誤:', error)
    return { success: false, error: error.message }
  }
}

// 取得 Token 狀態說明
export function getTokenStatusHelp() {
  return `
🔧 Channel Access Token 問題診斷：

1. **Token 已過期**
   - 前往 Line Developers Console
   - 重新生成 Channel Access Token
   - 更新程式碼中的 Token

2. **Token 權限不足**
   - 確認 Bot 已啟用 Messaging API
   - 檢查 Bot 狀態是否為「使用中」

3. **Token 格式錯誤**
   - 確認 Token 完整複製
   - 檢查是否有額外的空格或換行

4. **Bot 未加入好友**
   - 確認用戶已將 Bot 加入好友
   - 檢查 Bot 是否在好友列表中

5. **Webhook 設定問題**
   - 確認 Webhook URL 正確
   - 確認「Use webhook」已啟用

📋 檢查步驟：
1. 前往 https://developers.line.biz/console/
2. 選擇您的 Bot
3. 前往「Messaging API」頁面
4. 重新生成 Channel Access Token
5. 複製新的 Token 並更新程式碼
  `
} 