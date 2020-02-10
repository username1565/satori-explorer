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
        header("HTTP/1.0 404 Not Found");
        die('404 Not Found');
    }
}
else {
    header("HTTP/1.0 404 Not Found");
    die('404 Not Found');
}

function getFee() {
    global $config;

    $info = fetch_data($config['api'], 'fee');
    $feeRaw = $info['amount'];

    echo number_format($feeRaw / $config['coinUnits'], $config['coinDecimals'], '.', ',');
}

function getHashrate() {
    global $config;

    $info = fetch_data($config['api']);
    $difficulty = $info['difficulty'];

    echo number_format($difficulty / $config['blockTargetInterval'], $config['coinDecimals'], '.', ',');
}

function getDifficulty() {
    global $config;

    $info = fetch_data($config['api']);

    echo $info['difficulty'];
}

function getHeight() {
    global $config;

    $info = fetch_data($config['api'], 'height');

    echo $info['network_height'];
}

function getReward() {
    global $config;

    $lastBlock = fetch_rpc($config['api'], 'getlastblockheader', '{}');

    echo $lastBlock['result']['block_header']['reward'];
}

function getSupply() {
    global $config;

    $supplyRaw = getSupplyAtomic(true);

    echo number_format($supplyRaw / 100, $config['coinDecimals'], '.', ',');
}

function getSupplyAtomic($called = false) {
    global $config;

    $lastBlock = fetch_rpc($config['api'], 'getlastblockheader', '{}');
    $hash = $lastBlock['result']['block_header']['hash'];

    if ($hash) {
        $blockData = fetch_rpc($config['api'], 'f_block_json', '{"hash":"' . $hash . '"}');
        $supplyRaw = $blockData['result']['block']['alreadyGeneratedCoins'];

        if (!$called) {
            echo $supplyRaw;
        }

        return $supplyRaw;
    }
}
