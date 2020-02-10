<?php
function build_post_context($postData) {
    return stream_context_create(array(
            'http' =>
                array(
                    'method' => 'POST',
                    'header' => 'content-type: application/json',
                    'content' => $postData
                )
        )
    );
};

function build_rpc_body($method, $params) {
    return '{"jsonrpc":"2.0","id":"blockexplorer","method":"' . $method . '","params":' . $params . '}';
}

function fetch_rpc($api, $method, $params) {
    $url = $api . '/json_rpc';
    $rendered_rpc = build_rpc_body($method, $params);
    $context = build_post_context($rendered_rpc);
    $response = file_get_contents($url, false, $context);
    return json_decode($response, true);
}

function fetch_data($api, $endPoint = 'info') {
    $_url = $api . '/' . $endPoint;
    $response = file_get_contents($_url);
    return json_decode($response, true);
}
