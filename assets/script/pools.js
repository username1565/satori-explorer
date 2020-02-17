(function ($) {
    let xhrGetBlocks;
    let poolStats = [];
    let difficulties = [];
    let poolsChart = null;
    let totalHashrate = 0;
    let totalMiners = 0;
    let lastReward = 0;
    let avgDiff = 0;
    let networkPool;

    $(function () {
        currentPage = 'pool';
        let isReadyPool = setInterval(function() {
            if (appReady) {
                $.getJSON( 'https://raw.githubusercontent.com/cirquity/cirquity-pool-list/master/cirquity-pools.json', function( data ) {
                    console.log(data);
                    networkPool = data['pools'];
                    $.initPool();
                });

                clearInterval(isReadyPool);
            }
        }, 10);

        $('#calcHashRate').keyup($.calcEstimateProfit).change($.calcEstimateProfit);
        $('#calcHashUnits > li > a').click(function (e) {
            e.preventDefault();
            $('#calcHashUnit').text($(this).text()).data('mul', $(this).data('mul'));
            $.calcEstimateProfit();
        });
    });

    $.initPool = function() {
        networkPool.forEach(function (data) {
            const api = data.api;
            const host = data.url;
            const name = data.name;

            if (api !== undefined) {
                $.getJSON(api + '/stats', function (data, textStatus, jqXHR) {
                    let d = new Date(parseInt(data.pool.lastBlockFound));
                    let poolName = name;

                    if (poolName.length === 0) {
                        poolName = host;
                    }

                    $('#pools-rows').append($.renderPoolRow(host, poolName, data, d));

                    totalHashrate += parseInt(data.pool.hashrate);
                    totalMiners += parseInt(data.pool.miners);

                    $.updateText('totalPoolsHashrate', $.getReadableHashRateString(totalHashrate) + '/sec');
                    $.updateText('total_miners', $.localizeNumber(totalMiners));

                    poolStats.push([poolName, parseInt(data.pool.hashrate), '']);
                });
            }
        });

        setInterval(function () {
            totalHashrate = 0;
            totalMiners = 0;
            poolStats = [];

            networkPool.forEach(function (url, host, map) {
                let index = host.indexOf("/");
                let poolName;
                if (index < 0) {
                    poolName = host;
                } else {
                    poolName = host.substr(0, index);
                }

                $.getJSON(url + '/stats', (data, textStatus, jqXHR) => {
                    let d = new Date(parseInt(data.pool.lastBlockFound));
                    let dateString = $.renderDate(d);
                    //let agostring = $.timeago(d);

                    totalHashrate += parseInt(data.pool.hashrate);
                    totalMiners += parseInt(data.pool.miners);

                    $.updateText('height-' + poolName, $.localizeNumber(data.network.height));
                    $.updateText('hashrate-' + poolName, $.localizeNumber(data.pool.hashrate) + ' H/s');
                    $.updateText('miners-' + poolName, $.localizeNumber(data.pool.miners));
                    $.updateText('lastFound-' + poolName, dateString);
                    // $.updateText('ago-' + poolName, agostring);
                    $.updateText('totalPoolsHashrate', $.getReadableHashRateString(totalHashrate) + '/sec');
                    $.updateText('total_miners', $.localizeNumber(totalMiners));
                    $.updateText('networkHashrate', $.getReadableHashRateString(lastStats.difficulty / blockTargetInterval) + '/sec');
                    $.updateText('networkDifficulty', $.getReadableDifficultyString(lastStats.difficulty, 0).toString());

                    poolStats.push([poolName, parseInt(data.pool.hashrate), '']);
                });
            });
        }, 120000);

        $.updatePool();
    };

    $.updatePool = function () {
        $.updateText('networkHashrate', $.getReadableHashRateString(lastStats.difficulty / blockTargetInterval) + '/sec');
        $.updateText('networkDifficulty', $.getReadableDifficultyString(lastStats.difficulty, 0).toString());
        $.getBlocks();
        $.renderLastBlock();
    };
    
    
    $.getBlocks = function() {
        if (xhrGetBlocks) xhrGetBlocks.abort();
        xhrGetBlocks = $.ajax({
            url: api + '/json_rpc',
            method: 'POST',
            data: JSON.stringify({
                jsonrpc: '2.0',
                id: 'getBlocks',
                method: 'f_blocks_list_json',
                params: {
                    height: lastStats.height - 1
                }
            }),
            dataType: 'json',
            cache: 'false',
            success: function (data) {
                if (data.result) {
                    $.when(
                        $.renderBlocks(data.result.blocks)
                    ).then(function () {
                        setTimeout(function () {
                            $.calcAvgHashRate();
                        }, 100)
                    });
                }
            }
        })
    };
    
    
    $.renderBlocks = function(blocksResults) {
        for (let i = 0; i < blocksResults.length; i++) {
            const block = blocksResults[i];
            difficulties.push(parseInt(block.difficulty));
        }
    };
    
    
    $.renderLastBlock = function() {
        $.ajax({
            url: api + '/json_rpc',
            method: 'POST',
            data: JSON.stringify({
                jsonrpc: '2.0',
                id: 'lastBlock',
                method: 'getlastblockheader',
                params: {

                }
            }),
            dataType: 'json',
            cache: 'false',
            success: function (data) {
                let last_block_hash = data.result.block_header.hash;
                $.ajax({
                    url: api + '/json_rpc',
                    method: 'POST',
                    data: JSON.stringify({
                        jsonrpc: '2.0',
                        id: 'block',
                        method: "f_block_json",
                        params: {
                            hash: last_block_hash
                        }
                    }),
                    dataType: 'json',
                    cache: 'false',
                    success: function (data) {
                        const block = data.result.block;
                        lastReward = parseInt(block.baseReward);
                    }
                });
            }
        });
    };
    
    
    $.renderPoolRow = function (host, name, data, d) {
        // let agostring = $.timeago(d);
        let dateString = $.renderDate(d);
        let pools_row = [];

        pools_row.push('<tr>');
        pools_row.push('<th scope="row" id="host-' + name + '"><a target="_blank" href="' + host + '">' + name + '</a></th>');
        pools_row.push('<td id="height-' + name + '" class="height">' + $.localizeNumber(data.network.height) + '</td>');
        pools_row.push('<td id="hashrate-' + name + '">' + $.localizeNumber(data.pool.hashrate) + ' H/s</td>');
        pools_row.push('<td id="miners-' + name + '">' + $.localizeNumber(data.pool.miners) + '</td>');
        pools_row.push('<td id="totalFee-' + name + '">' + $.calculateTotalFee(data) + '%</td>');
        pools_row.push('<td id="minPayout-' + name + '">' + $.getReadableCoins(data.config.minPaymentThreshold, 2) + '</td>');
        pools_row.push('<td><span id="lastFound-' + name + '">' + dateString + '</span></td>');
        pools_row.push('</tr>');

        return pools_row.join('');
    };
    
    
    $.calcAvgHashRate = function() {
        let sum = difficulties.reduce(add, 0);
        function add(a, b) {
            return a + b;
        }
        avgDiff = Math.round(sum / difficulties.length);
        let avgHashRate = avgDiff / blockTargetInterval;

        $.updateText('avgDifficulty',$.getReadableDifficultyString(avgDiff, 0).toString());
        $.updateText('avgHashrate', $.getReadableHashRateString(avgDiff / blockTargetInterval));
        //updateText('blockSolveTime', getReadableTime(lastStats.difficulty / avgHashRate));
    };
    
    
    $.calcEstimateProfit = function() {
        try {
            let rateUnit = Math.pow(1024, parseInt($('#calcHashUnit').data('mul')));
            let hashRate = parseFloat($('#calcHashRate').val()) * rateUnit;
            let profit = (hashRate * 86400 / avgDiff /*lastStats.difficulty*/) * lastReward;
            console.log(rateUnit, hashRate, profit, lastReward);
            if (profit) {
                $.updateText('calcHashAmount', $.getReadableCoins(profit, 2, true));
                return;
            }
        }
        catch (e) { }
        $.updateText('calcHashAmount', '0');
    };


    $.calculateTotalFee = function (config) {
        let totalFee = config.config.fee;
        for (let property in config.config.donation) {
            if (config.config.donation.hasOwnProperty(property)) {
                totalFee += config.config.donation[property];
            }
        }
        return totalFee;
    };
    
    
    $.translateAPI2 = function (data) {
        return {
            'network': {
                'height': '',
            },
            'pool': {
                'hashrate': data.pool_statistics.hashRate,
                'miners': data.pool_statistics.miners,
            },
            'config': {
                'minPaymentThreshold': ''
            }
        };
    };
})(jQuery);