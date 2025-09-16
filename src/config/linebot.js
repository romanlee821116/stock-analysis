// Line Bot 配置
export const LINE_CONFIG = {
  // Line Bot 配置 - 使用環境變數
  CHANNEL_ACCESS_TOKEN: process.env.LINE_CHANNEL_ACCESS_TOKEN || '',
  USER_ID: process.env.LINE_USER_ID || '',
  CHANNEL_ID: process.env.LINE_CHANNEL_ID || '',
  CHANNEL_SECRET: process.env.LINE_CHANNEL_SECRET || '',
  
  // Line Bot 設定說明
  SETUP_INSTRUCTIONS: `
    📱 Line Bot 設定步驟：
    
    1. 前往 https://developers.line.biz/
    2. 登入並創建一個新的 Provider
    3. 在 Provider 下創建一個 Messaging API Channel
    4. 取得 Channel Access Token
    5. 將您的 Line User ID 加入好友
    6. 設定環境變數：
       - LINE_CHANNEL_ACCESS_TOKEN
       - LINE_CHANNEL_SECRET
       - LINE_USER_ID (可選)
       - LINE_CHANNEL_ID (可選)
    
    如何取得您的 Line User ID：
    1. 將您的 Line Bot 加入好友
    2. 發送訊息給 Bot
    3. 在 Line Developers Console 的 Webhook 設定中查看 User ID
  `
}

// 檢查配置是否完整
export function validateLineConfig() {
  const { CHANNEL_ACCESS_TOKEN, CHANNEL_SECRET } = LINE_CONFIG
  
  if (!CHANNEL_ACCESS_TOKEN) {
    throw new Error('請先設定 LINE_CHANNEL_ACCESS_TOKEN 環境變數')
  }
  
  if (!CHANNEL_SECRET) {
    throw new Error('請先設定 LINE_CHANNEL_SECRET 環境變數')
  }
  
  return true
}
