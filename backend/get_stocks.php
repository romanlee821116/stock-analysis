<?php
header('Access-Control-Allow-Origin: *');
header('Content-Type: application/json');

// 取得今天與昨日日期（格式：YYYYMMDD）
$date = date('Ymd');
$yesterday = date('Ymd', strtotime('-1 day'));

function fetch_stocks($date) {
    $url = "https://www.twse.com.tw/exchangeReport/MI_INDEX?response=csv&date={$date}&type=ALLBUT0999";
    $csv = @file_get_contents($url);
    $result = [];
    if ($csv !== false) {
        $csv = mb_convert_encoding($csv, 'UTF-8', 'BIG5');
        // var_dump($csv);
        $lines = explode("\n", $csv);
        foreach ($lines as $line) {
            if (preg_match('/^=?"\\d{4,6}"/', $line)) {
                $fields = str_getcsv($line);
                $symbol = trim($fields[0], ' ="');
                $result[$symbol] = [
                    'symbol' => $symbol,
                    'name' => trim($fields[1], ' "'),
                    'close' => trim($fields[8], ' "'),
                    'trade_count' => trim($fields[2], ' "'),
                ];
            }
        }
    }
    return $result;
}

// 取得今日與昨日資料
$today_stocks = fetch_stocks($date);
$yesterday_stocks = fetch_stocks($yesterday);

// 合併昨日收盤價與成交筆數
$stocks = [];
foreach ($today_stocks as $symbol => $info) {
    $prev_close = isset($yesterday_stocks[$symbol]) ? $yesterday_stocks[$symbol]['close'] : null;
    $prev_trade_count = isset($yesterday_stocks[$symbol]) ? $yesterday_stocks[$symbol]['trade_count'] : null;
    $stocks[] = [
        'date' => $date,
        'symbol' => $info['symbol'],
        'name' => $info['name'],
        'close' => $info['close'],
        'trade_count' => $info['trade_count'],
        'prev_close' => $prev_close,
        'prev_trade_count' => $prev_trade_count
    ];
}

echo json_encode($stocks, JSON_UNESCAPED_UNICODE); 