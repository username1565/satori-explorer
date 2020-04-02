(function ($) {
    let startYear = 2020;
    let genesisTimestamp = 1579553288;
    let emissionCurveInterval = 20000;
    let emissionCurveDataPoints = 15000;
    let addressPrefix = 3914525;

    $(function () {
        currentPage = 'supply';
        let isReadySupply = setInterval(function () {
            if (appReady) {
                $.initSupply();
                clearInterval(isReadySupply);
            }
        }, 10);

        if (typeof google !== 'undefined') {
            google.charts.load('current', {
                packages: ['corechart']
            })
        }
    });

    $.initSupply = function () {
        const chartOptions = {
            legend: {
                position: 'bottom'
            },
            chartArea: {
                height: '80%',
                width: '100%',
            },
            vAxes: {
                0: {
                    logScale: false
                },
                1: {
                    logScale: false
                }
            },
            series: {
                0: {
                    targetAxisIndex: 0,
                    curveType: 'function'
                },
                1: {
                    targetAxisIndex: 1,
                    curveType: 'function'
                }
            },
            hAxis: {
                title: 'Estimated Year',
                minorGridlines: {
                    count: 0
                }
            },
            colors: ['#335eea', '#42ba96', '#8e7cc3', '#00853d', '#212721', '#fac5c3', '#6d9eeb', '#45818e', '#de5f5f']
        };

        google.charts.setOnLoadCallback(function () {
            const chart = new google.visualization.AreaChart(document.getElementById('supply'));

            const chartData = [
                ['', 'Emitted Supply', 'Block Reward']
            ];

            let generatedCoins = 0;
            for (let i = 0; i < emissionCurveDataPoints; i++) {
                let blockReward = $.getNextReward(generatedCoins);
                generatedCoins += blockReward;
                let block = (i * emissionCurveInterval);
                let date = $.calculateEstimatedBlockDate(block);
                let label = {
                    v: date,
                    f: 'Block: ' + numeral(block).format('0,0') + ' estimated at ' + date.toUTCString()
                };
                chartData.push([
                    label,
                    (generatedCoins / Math.pow(10, coinDisplayDecimals)) * emissionCurveInterval,
                    (blockReward / Math.pow(10, coinDisplayDecimals))
                ]);
            }

            const gChartData = google.visualization.arrayToDataTable(chartData);
            chart.draw(gChartData, chartOptions)
        })
    };


    $.calculateEstimatedBlockDate = function (block) {
        const estimatedTimestamp = genesisTimestamp + (block * blockTargetInterval);
        return new Date(estimatedTimestamp * 1000)
    };


    $.getNextReward = function (currentSupply) {
        const m_currentSupply = bigInt(currentSupply.toString()).multiply(emissionCurveInterval);
        return bigInt(coinTotalSupply).subtract(m_currentSupply.toString()).shiftRight(coinEmissionSpeed).toJSNumber();
    };
})(jQuery);