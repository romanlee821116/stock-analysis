// 取得 Line User ID 的工具
import { LINE_CONFIG } from '../config/linebot.js'

// 測試 Line Bot 連接
export async function testLineBotConnection() {
  try {
    const response = await fetch('https://api.line.me/v2/bot/profile/U1234567890', {
      headers: {
        'Authorization': `Bearer ${LINE_CONFIG.CHANNEL_ACCESS_TOKEN}`
      }
    })
    
    console.log('Line Bot 連接測試結果:', response.status)
    return response.ok
  } catch (error) {
    console.error('Line Bot 連接測試失敗:', error)
    return false
  }
}

// 取得 User ID 的說明
export function getUserIDInstructions() {
  return `
    📱 取得您的 Line User ID：
    
    方法一：透過 Line Developers Console
    1. 前往 Line Developers Console
    2. 在「Messaging API」頁面啟用 Webhook
    3. 設定 Webhook URL（可以暫時設定為 https://example.com）
    4. 發送訊息給您的 Bot
    5. 在 Webhook 記錄中查看 User ID
    
    方法二：使用 Line Bot SDK
    1. 將 Bot 加入好友
    2. 發送訊息給 Bot
    3. 在 Line Developers Console 查看訊息記錄
    
    方法三：使用 Line 官方工具
    1. 前往 https://developers.line.biz/console/
    2. 在您的 Bot 設定中查看最近的訊息
    3. 找到發送者的 User ID
    
    User ID 通常是一串數字，例如：U1234567890abcdef
  `
}

// 驗證 User ID 格式
export function validateUserID(userID) {
  // Line User ID 通常是 U 開頭的一串字元
  const userIDPattern = /^U[a-zA-Z0-9]+$/
  return userIDPattern.test(userID)
} 