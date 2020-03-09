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
            const type = data.type;

            if (api !== undefined) {
                if (type === 'cryptonote-nodejs-pool') {
                    $.getPoolStatsCryptonote(api, host, name, false);
                }

                if (type === 'snipa22-nodejs-pool') {
                    $.getPoolStatsSnipa(api, host, name, false);
                }
            }
        });

        setInterval(function () {
            totalMiners = 0;
            totalHashrate = 0;
            poolStats = [];

            networkPool.forEach(function (data) {
                const api = data.api;
                const host = data.url;
                const name = data.name;
                const type = data.type;

                if (api !== undefined) {
                    if (type === 'cryptonote-nodejs-pool') {
                        $.getPoolStatsCryptonote(api, host, name, true);
                    }

                    if (type === 'snipa22-nodejs-pool') {
                        $.getPoolStatsSnipa(api, host, name, true);
                    }
                }
            });
        }, 120000);

        $.updatePool();
    };


    $.getPoolStatsCryptonote = function(api, host, name, update) {
        if (update) {
            totalMiners = 0;
            totalHashrate = 0;
            poolStats = [];
        }

        $.getJSON($.getApiUrl(api + '/stats'), function (data, textStatus, jqXHR) {
            let d = new Date(parseInt(data.pool.lastBlockFound));
            let poolName = name;

            if (poolName.length === 0) {
                poolName = host;
            }

            let poolId = poolName.replace(' ', '-').toLowerCase();
            let poolMiners = data.pool.miners;

            totalMiners += parseInt(data.pool.miners);
            if (typeof data.pool.minersSolo !== 'undefined') {
                totalMiners += parseInt(data.pool.minersSolo);
                poolMiners = poolMiners + data.pool.minersSolo;
            }
            totalHashrate += parseInt(data.pool.hashrate);

            $.updateText('totalPoolsHashrate', $.getReadableHashRateString(totalHashrate) + '/sec');
            $.updateText('total_miners', $.localizeNumber(totalMiners));


            if (update) {
                let dateString = $.renderDate(d);
                $.updateText('height-' + poolId, $.localizeNumber(data.network.height));
                $.updateText('hashrate-' + poolId, $.localizeNumber(data.pool.hashrate) + ' H/s');
                $.updateText('miners-' + poolId, $.localizeNumber(poolMiners));
                $.updateText('lastFound-' + poolId, dateString);
                $.updateText('networkHashrate', $.getReadableHashRateString(lastStats.difficulty / blockTargetInterval) + '/sec');
                $.updateText('networkDifficulty', $.getReadableDifficultyString(lastStats.difficulty, 0).toString());
            }
            else {
                $('#pools-rows').append($.renderPoolRow(host, poolName, poolId, data, d));
            }

            poolStats.push([poolId, parseInt(data.pool.hashrate), '']);
        });
    };


    $.getPoolStatsSnipa = function(api, host, name, update) {
        if (update) {
            totalMiners = 0;
            totalHashrate = 0;
            poolStats = [];
        }

        $.getJSON(api + '/config', function (config, textStatus, jqXHR) {
            $.getJSON(api + '/pool/stats', function (pool, textStatus, jqXHR) {
                $.getJSON(api + '/network/stats', function (network, textStatus, jqXHR) {
                    const data = $.elaborateSnipa(config, pool, network);

                    let d = new Date(parseInt(data.pool.lastBlockFound));
                    let poolName = name;

                    if (poolName.length === 0) {
                        poolName = host;
                    }

                    let poolId = poolName.replace(' ', '-').toLowerCase();

                    totalMiners += parseInt(data.pool.miners);
                    totalHashrate += parseInt(data.pool.hashrate);

                    $.updateText('totalPoolsHashrate', $.getReadableHashRateString(totalHashrate) + '/sec');
                    $.updateText('total_miners', $.localizeNumber(totalMiners));

                    if (update) {
                        let dateString = $.renderDate(d);
                        $.updateText('height-' + poolId, $.localizeNumber(data.network.height));
                        $.updateText('hashrate-' + poolId, $.localizeNumber(data.pool.hashrate) + ' H/s');
                        $.updateText('miners-' + poolId, $.localizeNumber(data.pool.miners));
                        $.updateText('lastFound-' + poolId, dateString);
                        $.updateText('networkHashrate', $.getReadableHashRateString(lastStats.difficulty / blockTargetInterval) + '/sec');
                        $.updateText('networkDifficulty', $.getReadableDifficultyString(lastStats.difficulty, 0).toString());
                    }
                    else {
                        $('#pools-rows').append($.renderPoolRow(host, poolName, poolId, data, d));
                    }

                    poolStats.push([poolId, parseInt(data.pool.hashrate), '']);
                });
            });
        });
    };


    $.elaborateSnipa = function (config, pool, network) {
        return {
            config: {
                fee: config.pps_fee,
                donation: config.dev_donation,
                minPaymentThreshold: config.min_wallet_payout
            },
            pool: {
                hashrate: pool.pool_statistics.hashRate,
                miners: pool.pool_statistics.miners,
                lastBlockFound: pool.pool_statistics.lastBlockFoundTime * 1000
            },
            network: {
                height: network.height
            }
        };
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
    
    
    $.renderPoolRow = function (host, name, id, data, d) {
        // let agostring = $.timeago(d);
        let dateString = $.renderDate(d);
        let pools_row = [];
        let poolMiners = data.pool.miners;

        if (typeof data.pool.minersSolo !== 'undefined') {
            poolMiners = poolMiners + data.pool.minersSolo;
        }

        pools_row.push('<tr>');
        pools_row.push('<th scope="row" id="host-' + id + '"><a target="_blank" href="' + host + '">' + name + '</a></th>');
        pools_row.push('<td id="height-' + id + '" class="height">' + $.localizeNumber(data.network.height) + '</td>');
        pools_row.push('<td id="hashrate-' + id + '">' + $.localizeNumber(data.pool.hashrate) + ' H/s</td>');
        pools_row.push('<td id="miners-' + id + '">' + $.localizeNumber(poolMiners) + '</td>');
        pools_row.push('<td id="totalFee-' + id + '">' + $.calculateTotalFee(data) + '%</td>');
        pools_row.push('<td id="minPayout-' + id + '">' + $.getReadableCoins(data.config.minPaymentThreshold, 2) + '</td>');
        pools_row.push('<td><span id="lastFound-' + id + '">' + dateString + '</span></td>');
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


    $.getApiUrl = function(url) {
        let apiUrl = url;

        if (url.indexOf('https') === -1) {
            apiUrl = '/api/node/?url=' + encodeURIComponent(url);
        }

        return apiUrl;
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