<?php
include_once('utils.php');
$config = include_once('config.php');

$enable = [
    "height",
    "supply",
    "reward",
    "hashrate",
    "fee",
    "difficulty"
];

$request = trim($_SERVER['REQUEST_URI'], '/');
$parts = explode('/', $request);
$result = '';

if (count($parts) >= 2) {
    if (in_array($parts[1], $enable)) {
        if ($parts[1] === 'supply' && isset($parts[2]) && $parts[2] === 'atomic') {
            call_user_func('get'.ucfirst($parts[1]).ucfirst($parts[2]), $result);
        }
        else {
            call_user_func('get'.ucfirst($parts[1]), $result);
        }
    }
    else {
        if ($parts[1] === 'node') {
            $nodeUrl = urldecode(str_replace('?url=', '', $parts[2]));
            getNodeInfo($nodeUrl);
        }
        else {
            header("HTTP/1.0 404 Not Found");
            die('404 Not Found');
        }
    }
}
else {
    header("HTTP/1.0 404 Not Found");
    die('404 Not Found');
}

function getNodeInfo($url) {
    $ch = curl_init();
    curl_setopt($ch, CURLOPT_URL, $url);
    curl_setopt($ch, CURLOPT_RETURNTRANSFER, 1);
    $result = curl_exec($ch);
    curl_close($ch);

    return_json($result);
}

function getFee() {
    global $config;

    $info = fetch_data($config['api'], 'fee');
    $feeRaw = $info['amount'];

    return_json(number_format($feeRaw / $config['coinUnits'], $config['coinDecimals'], '.', ','));
}

function getHashrate() {
    global $config;

    $info = fetch_data($config['api']);
    $difficulty = $info['difficulty'];

    return_json(number_format($difficulty / $config['blockTargetInterval'], $config['coinDecimals'], '.', ','));
}

function getDifficulty() {
    global $config;

    $info = fetch_data($config['api']);

    return_json($info['difficulty']);
}

function getHeight() {
    global $config;

    $info = fetch_data($config['api'], 'height');

    return_json($info['network_height']);
}

function getReward() {
    global $config;

    $lastBlock = fetch_rpc($config['api'], 'getlastblockheader', '{}');

    return_json($lastBlock['result']['block_header']['reward']);
}

function getSupply() {
    global $config;

    $supplyRaw = getSupplyAtomic(true);

    return_json(number_format($supplyRaw / 100, $config['coinDecimals'], '.', ','));
}

function getSupplyAtomic($called = false) {
    global $config;

    $lastBlock = fetch_rpc($config['api'], 'getlastblockheader', '{}');
    $hash = $lastBlock['result']['block_header']['hash'];

    if ($hash) {
        $blockData = fetch_rpc($config['api'], 'f_block_json', '{"hash":"' . $hash . '"}');
        $supplyRaw = $blockData['result']['block']['alreadyGeneratedCoins'];

        if (!$called) {
            return_json($supplyRaw);
        }

        return $supplyRaw;
    }
}
