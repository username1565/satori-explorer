(function ($) {
    let xhrGetBlocks;
    let block,
        difficulties = [],
        blocks = [],
        rewards = [],
        transactions = [],
        sizes = [],
        timestamps = [],
        diffChart;

    $(function () {
        currentPage = 'home';
        let isReadyHome = setInterval(function() {
            if (appReady) {
                $.when(
                    $.renderInitialBlocks()
                ).then(function () {
                    setTimeout(function () {
                        $.displayDiffChart();
                        $.refreshChart();
                    }, 500)
                }).done($.updateHome());

                clearInterval(isReadyHome);
            }
        }, 10);

        $('#loadMoreBlocks').click(function () {
            if (xhrGetBlocks) xhrGetBlocks.abort();
            xhrGetBlocks = $.ajax({
                url: api + '/json_rpc',
                method: 'POST',
                data: JSON.stringify({
                    jsonrpc: '2.0',
                    id: 'loadMore',
                    method: 'f_blocks_list_json',
                    params: {
                        height: $('#blocks-rows').children().last().data('height')
                    }
                }),
                dataType: 'json',
                cache: 'false',
                success: function (data) {
                    $.when(
                        $.renderBlocks(data.result.blocks)
                    ).then(function () {
                        setTimeout(function () {
                            $.loadMoreChart();
                        }, 100)
                    });
                }
            });
        });
    });


    $.updateHome = function() {
        $.renderLastBlock();
        $.updateText('networkHeight', $.localizeNumber(lastStats.height.toString()));

        let forkDays = (nextForkHeight - lastStats.height) / (24 * 60 * 60 / coinDifficultyTarget);
        let forkDate = new Date();
        forkDate.setDate(forkDate.getDate() + forkDays);

        $.updateText('nextFork', lastStats.last_known_block_index < (nextForkHeight+1) ? $.renderDate(forkDate) : "to be announced...");
        $.updateText('networkTransactions', $.localizeNumber(lastStats.tx_count.toString()));
        $.updateText('networkHashrate', $.getReadableHashRateString(lastStats.difficulty / blockTargetInterval));
        $.updateText('networkDifficulty', $.getReadableDifficultyString(lastStats.difficulty, 0).toString());

        $.getPoolTransactions();
        let currHeight = $('#blocks-rows').children().first().data('height');

        if ((currHeight + 31) > lastStats.last_known_block_index) {
            $.when(
                $.renderInitialBlocks()
            ).then(function () {
                setTimeout(function () {
                    $.refreshChart();
                }, 100)
            });
        }

        if ((currHeight + 31) < lastStats.last_known_block_index) {
            $('#next-page').removeClass('disabled');
        }
    };


    $.renderInitialBlocks = function () {
        if (xhrGetBlocks) xhrGetBlocks.abort();

        let loadHeight;

        if ($.urlParam('height')) {
            loadHeight = parseInt($.urlParam('height'));
        } else {
            loadHeight = lastStats.last_known_block_index + 1;
        }

        if ((loadHeight - 31) < 0) {
            $('#prev-page').addClass('disabled');
            $('#next-page').removeClass('disabled');
        }

        xhrGetBlocks = $.ajax({
            url: api + '/json_rpc',
            method: 'POST',
            data: JSON.stringify({
                jsonrpc: '2.0',
                id: 'test',
                method: 'f_blocks_list_json',
                params: {
                    height: loadHeight
                }
            }),
            dataType: 'json',
            cache: 'false',
            success: function (data) {
                $.renderBlocks(data.result.blocks);
            }
        });
    };


    $.renderLastBlock = function() {
        $.ajax({
            url: api + '/json_rpc',
            method: 'POST',
            data: JSON.stringify({
                jsonrpc: '2.0',
                id: 'lastBlock',
                method: 'getlastblockheader',
                params: {}
            }),
            dataType: 'json',
            cache: 'false',
            success: function (data) {
                const last_block_hash = data.result.block_header.hash;
                $.ajax({
                    url: api + '/json_rpc',
                    method: 'POST',
                    data: JSON.stringify({
                        jsonrpc: '2.0',
                        id: 'lastBlockHash',
                        method: 'f_block_json',
                        params: {
                            hash: last_block_hash
                        }
                    }),
                    dataType: 'json',
                    cache: 'false',
                    success: function (data) {
                        block = data.result.block;
                        $.updateText('totalCoins', $.getReadableCoins(block.alreadyGeneratedCoins, 2));
                        $.updateText('emissionPercent', (block.alreadyGeneratedCoins / coinTotalSupply * 100).toFixed(4));
                        $.updateText('currentReward', $.getReadableCoins(block.baseReward, 2));
                    }
                });
            }
        });
    };


    $.renderBlocks = function (blocksResults) {
        let $blocksRows = $('#blocks-rows');

        for (let i = 0; i < blocksResults.length; i++) {
            let block = blocksResults[i];
            let blockJson = JSON.stringify(block);
            let existingRow = document.getElementById('blockRow' + block.height);

            if (existingRow && existingRow.getAttribute('data-json') !== blockJson) {
                $(existingRow).replaceWith($.getBlockRowElement(block, blockJson));
            } else if (!existingRow) {
                let blockElement = $.getBlockRowElement(block, blockJson);

                let inserted = false;
                let rows = $blocksRows.children().get();
                for (let f = 0; f < rows.length; f++) {
                    let bHeight = parseInt(rows[f].getAttribute('data-height'));
                    if (bHeight < block.height) {
                        inserted = true;
                        $(rows[f]).before(blockElement);
                        break;
                    }
                }
                if (!inserted) {
                    $blocksRows.append(blockElement);
                }
            }
        }
        // $('time.timeago').timeago();
        $.renderBlocksPageRange(blocksResults);
        $.calcAvgHashRate();
    };


    $.getBlockRowElement = function(block, jsonString) {
        let row = document.createElement('tr');
        row.setAttribute('data-json', jsonString);
        row.setAttribute('data-height', block.height);
        row.setAttribute('id', 'blockRow' + block.height);
        row.setAttribute('title', block.hash);
        let dateTime = new Date(block.timestamp * 1000).toISOString();
        row.setAttribute('data-dt', dateTime);
        let columns =
            '<th scope="row" class="height">' + $.localizeNumber(block.height) + '</th>' +
            '<td class="size">' + $.localizeNumber(block.cumul_size) + '</td>' +
            '<th scope="row">' + $.formatBlockLink(block.hash) + '</th>' +
            '<td class="blk-diff">' + $.localizeNumber(block.difficulty) + '</td>' +
            '<td class="txses">' + $.localizeNumber(block.tx_count) + '</td>' +
            '<td class="date-time">' + $.formatDate(block.timestamp) + '</td>';
            //'<td class="date-time">' + $.formatDate(block.timestamp) + ' (<time class="timeago" datetime="' + dateTime + '"></time>)</td>';

        difficulties.push(parseInt(block.difficulty));
        blocks.push(parseInt(block.height));
        transactions.push(parseInt(block.tx_count));
        sizes.push(parseInt(block.cumul_size));
        timestamps.push(dateTime);

        row.innerHTML = columns;

        return row;
    };


    $.getPoolTransactions = function() {
        $.ajax({
            url: api + '/json_rpc',
            method: 'POST',
            data: JSON.stringify({
                jsonrpc: '2.0',
                id: 'poolTransactions',
                method: 'f_on_transactions_pool_json',
                params: {}
            }),
            dataType: 'text',
            cache: 'false',
            success: function (data) {
                let txsRows = document.getElementById('mem-pool-rows');
                while (txsRows.firstChild) {
                    txsRows.removeChild(txsRows.firstChild);
                }

                let rawTxs = data.split('"transactions":').pop();
                //console.log(rawTxs);
                rawTxs = rawTxs.split('}}')[0];
                //console.log(rawTxs);
                let transactions = JSON.parse(rawTxs);
                let txsArray = [];
                txsArray = rawTxs.split('\n\n');
                //console.log(transactions);
                for (let tx in transactions) {
                    //console.log(transactions[tx]);
                    let hash = transactions[tx].hash;
                    if (hash !== "") {
                        let amount = transactions[tx].amount_out.toFixed(2);
                        let fee = transactions[tx].fee.toFixed(2);
                        let size = transactions[tx].size;
                        let row = document.createElement('tr');
                        let timestamp = Date().now; // this is not yet part of the json that gets returned in f_transactions_pool_json, leave for now
                        let columns =
                            /*'<td>' + formatDate(timestamp) + ' (<span class="mtx-ago"></span>)' + '</td>' +*/
                            '<th scope="row">' + $.getReadableCoins(amount, 2, true) + '</th>' +
                            '<td>' + $.getReadableCoins(fee, 2, true) + '</td>' +
                            '<td>' + $.localizeNumber(size) + '</td>' +
                            '<th scope="row">' + $.formatPaymentLink(hash) + '</th>';
                        row.innerHTML = columns;
                        $(txsRows).append(row);
                        //$(row).find('.mtx-ago').timeago('update', new Date(timestamp * 1000).toISOString()); We can re-enable this after a timestamp is added to the mem_pool json
                    }
                }
                $.updateText('mempool_count', document.querySelectorAll('#mem-pool-rows tr').length);
            },
            error: function (data) {
                console.log(data);
            }
        });
    };


    $.renderBlocksPageRange = function(blocks) {
        let rendered = [
            $.localizeNumber(blocks[0].height),
            $.localizeNumber(blocks[blocks.length - 1].height)
        ].join(' - ');
        $.updateText('block-range', rendered);
    };


    $.calcAvgHashRate = function() {
        let sum = difficulties.reduce(function (a, b) {
            return a + b;
        }, 0);

        let avgDiff = Math.round(sum / difficulties.length);
        let avgHashRate = avgDiff / blockTargetInterval;

        $.updateText('avgDifficulty', $.getReadableDifficultyString(avgDiff, 0).toString());
        $.updateText('avgHashrate', $.getReadableHashRateString(avgDiff / blockTargetInterval));
        //$.updateText('blockSolveTime', getReadableTime(lastStats.difficulty / avgHashRate)); Add back after timestamp is added to mempool
    };


    $.displayDiffChart = function() {
        let ctx = document.getElementById("difficultyChart");
        let chartData = {
            //labels: [].concat(Blocks).reverse(),
            labels: [].concat($.formatDate(timestamps)).reverse(),
            datasets: [
                {
                    data: [].concat(blocks).reverse(),
                    yAxisID: "Height",
                    label: "Height",
                    backgroundColor: "rgba(0,0,0,0)",
                    borderColor: 'rgba(0,0,0,0)',
                    borderWidth: 0,
                    pointBorderWidth: 0,
                    pointRadius: 0,
                    pointHoverRadius: 0,
                    pointHitRadius: 0,
                    display: false
                }, {
                    data: [].concat(difficulties).reverse(),
                    yAxisID: "Difficulty",
                    label: "Difficulty",
                    backgroundColor: "rgba(250,215,118,0.3)",
                    borderColor: '#fad776',
                    borderWidth: 1,
                    pointColor: "#fad776",
                    pointBorderColor: "#fad776",
                    pointHighlightFill: "#fad776",
                    pointBackgroundColor: "#fad776",
                    pointBorderWidth: 1,
                    pointRadius: 1,
                    pointHoverRadius: 3,
                    pointHitRadius: 20
                }, {
                    data: [].concat(transactions).reverse(),
                    yAxisID: "Transactions",
                    label: "Transactions",
                    backgroundColor: "rgba(66,186,150,0.4)",
                    borderColor: '#42ba96',
                    borderWidth: 1,
                    pointColor: "#42ba96",
                    pointBorderColor: "#42ba96",
                    pointHighlightFill: "#42ba96",
                    pointBackgroundColor: "#42ba96",
                    pointBorderWidth: 1,
                    pointRadius: 1,
                    pointHoverRadius: 3,
                    pointHitRadius: 20
                }, {
                    data: [].concat(sizes).reverse(),
                    yAxisID: "Sizes",
                    label: "Size",
                    backgroundColor: "rgba(124,105,239,0.4)",
                    borderColor: '#7c69ef',
                    borderWidth: 1,
                    pointColor: "#7c69ef",
                    pointBorderColor: "#7c69ef",
                    pointHighlightFill: "#7c69ef",
                    pointBackgroundColor: "#7c69ef",
                    pointBorderWidth: 1,
                    pointRadius: 1,
                    pointHoverRadius: 3,
                    pointHitRadius: 20
                }
            ]
        };
        let options = {
            responsive: true,
            maintainAspectRatio: false,
            elements: {
                line: {
                    tension: 0
                }
            },
            title: {
                display: false
            },
            legend: {
                display: false
            },
            scales: {
                yAxes: [{
                    id: 'Height',
                    type: 'linear',
                    position: 'left',
                    scaleLabel: {
                        display: false,
                        labelString: 'Height'
                    },
                    gridLines: {
                        display: false
                    },
                    ticks: {
                        fontSize: 9,
                        display: false
                    },
                    display: false
                }, {
                    id: 'Difficulty',
                    type: 'linear',
                    position: 'left',
                    scaleLabel: {
                        display: false,
                        labelString: 'Difficulty'
                    },
                    gridLines: {
                        display: false
                    },
                    ticks: {
                        fontSize: 9,
                        display: false
                    },
                    display: false
                }, {
                    id: 'Transactions',
                    type: 'linear',
                    position: 'right',
                    scaleLabel: {
                        display: false,
                        labelString: 'Transactions'
                    },
                    gridLines: {
                        display: false
                    },
                    ticks: {
                        fontSize: 9,
                        display: false
                    },
                    display: false
                }, {
                    id: 'Sizes',
                    type: 'linear',
                    position: 'right',
                    scaleLabel: {
                        display: false,
                        labelString: 'Size'
                    },
                    gridLines: {
                        display: false
                    },
                    ticks: {
                        fontSize: 9,
                        display: false
                    },
                    display: false
                }

                ],
                xAxes: [{
                    type: "time",
                    time: {
                        parser: false,
                        unit: 'minute',
                        unitStepSize: 60,
                        round: 'second',
                        displayFormats: {
                            'millisecond': 'SSS [ms]',
                            'second': 'HH:mm:ss', // 11:20:01 AM
                            'minute': 'HH:mm', // 11:20:01 AM
                            'hour': 'HH:mm', // Sept 4, 5PM
                            'day': 'MMM Do', // Sep 4 2015
                            'week': 'll', // Week 46, or maybe "[W]WW - YYYY" ?
                            'month': 'MMM YYYY', // Sept 2015
                            'quarter': '[Q]Q - YYYY', // Q3
                            'year': 'YYYY', // 2017
                        },
                    },
                    gridLines: {
                        display: false
                    },
                    ticks: {
                        fontSize: 9,
                        fontColor: "#CCC",
                        autoSkip: true,
                        //maxRotation: 90,
                        //minRotation: 90
                        //display:false
                    }
                    //display: false
                }]
            },
            tooltips: {
                mode: 'index',
                //displayColors: false,
                callbacks: {
                    title: function (tooltipItem, data) {
                        let height = data.datasets[3].data[tooltipItem[0].index];
                        let time = new Date(data.labels[tooltipItem[0].index]).toLocaleString();
                        //return 'Блок №: ' + height + ' - ' + time + '';
                        return time + '';
                    },/*
					label: function(tooltipItem, data) {
						let diff		= data.datasets[0].data[tooltipItem.index];
						let txcount	= data.datasets[1].data[tooltipItem.index];
						let size		= data.datasets[2].data[tooltipItem.index];

						let diff_swatch_color = data.datasets[0].borderColor;

						console.log(diff_swatch_color);

						let diff_swatch = '<span style="color="'+ diff_swatch_color +'">&bullet;</span>';

						let multistringText = [];

						let str1 = diff_swatch + 'Складність: ' + diff + '';
						let str2 = 'Розмір: ' + size + '';
						let str3 = 'Транзакції: ' + txcount + '';

						multistringText.push(str1);
						multistringText.push(str2);
						multistringText.push(str3);

						return multistringText;
					}*/
                }
            }
        };
        diffChart = new Chart(ctx, {
            type: 'line',
            data: chartData,
            options: options
        });
    };


    $.refreshChart = function() {
        let brows = $('#blocks-rows').children(),
            labels = [],
            diffs = [],
            sizes = [],
            times = [],
            heights = [],
            txsnr = [];
        for (let i = 0; i < brows.length; i++) {
            let row = $(brows[i]);
            let label = parseInt(row.find('th.height').text().replace(/[, ]+/g, '').trim());
            let diff = parseInt(row.find('td.blk-diff').text().replace(/[, ]+/g, '').trim());
            let txses = parseInt(row.find('td.txses').text().replace(/[, ]+/g, '').trim());
            let size = parseInt(row.find('td.size').text().replace(/[, ]+/g, '').trim());
            let time = row.attr('data-dt');

            labels.push(label);
            diffs.push(diff);
            txsnr.push(txses);
            sizes.push(size);
            times.push(time);
        }
        //diffChart.data.labels = labels.reverse();
        if (diffChart) {
            diffChart.data.labels = times.reverse();
            diffChart.data.datasets[0].data = labels.reverse();
            diffChart.data.datasets[1].data = diffs.reverse();
            diffChart.data.datasets[2].data = txsnr.reverse();
            diffChart.data.datasets[3].data = sizes.reverse();
            diffChart.update();
        }
    };

    $.loadMoreChart = function() {
        //diffChart.data.labels = [].concat(Blocks).reverse();
        diffChart.data.labels = [].concat(timestamps).reverse();
        diffChart.data.datasets[0].data = [].concat(blocks).reverse();
        diffChart.data.datasets[1].data = [].concat(difficulties).reverse();
        diffChart.data.datasets[2].data = [].concat(transactions).reverse();
        diffChart.data.datasets[3].data = [].concat(sizes).reverse();
        diffChart.update();
    }
})(jQuery);
