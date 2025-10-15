// Google Gemini API 服務
export async function callGemini(prompt, geminiApiKey) {
  const apiUrl = import.meta.env.DEV 
    ? 'http://localhost:3000/api/gemini' 
    : '/api/gemini';

  const res = await fetch(apiUrl, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({ prompt, geminiApiKey })
  });

  if (!res.ok) {
    const errorText = await res.text();
    console.error('❌ API error:', errorText);
    throw new Error(`API error: ${res.status} ${res.statusText}`);
  }

  const data = await res.json();
  return responseFormatter(data.response);
}

const responseFormatter = (response) => {
  // 清理 Markdown 格式的程式碼區塊
  let cleanResponse = response.trim();
  
  // 移除 ```json 和 ``` 標記
  if (cleanResponse.startsWith('```json')) {
    cleanResponse = cleanResponse.replace(/^```json\s*/, '');
  }
  if (cleanResponse.startsWith('```')) {
    cleanResponse = cleanResponse.replace(/^```\s*/, '');
  }
  if (cleanResponse.endsWith('```')) {
    cleanResponse = cleanResponse.replace(/\s*```$/, '');
  }
  
  const jsonMatch = cleanResponse.match(/\{[\s\S]*\}/);
  if (jsonMatch) {
    cleanResponse = jsonMatch[0];
  }
  
  
  const data = JSON.parse(cleanResponse);
  
  const stocks = data.stocks.reduce((result, item) => {
    if (result[item.industry]) {
      result[item.industry].push(item);
    } else {
      result[item.industry] = [item];
    }
    return result;
  }, {});

  return {
    stocks,
    recommendations: data.recommendations
  }
}
