const blockchainExplorer = "block.html?hash={id}";
const transactionExplorer = "transaction.html?hash={id}";
const paymentIdExplorer = "paymentid.html?hash={id}";

let appReady = false;
let currentPage = 'home';
let lastStats;
let numberFormatter = new Intl.NumberFormat('en-US');

(function ($) {
    $(function () {
        // ================================================
        //  NAVBAR BEHAVIOR
        // ================================================
        $(window).on('scroll load', function () {
            if ($(window).scrollTop() > 5) {
                $('.navbar').addClass('active');
            }
            else {
                $('.navbar').removeClass('active');
            }

            if ($(window).scrollTop() > 1000) {
                $('#scrollTop').addClass('active');
            }
            else {
                $('#scrollTop').removeClass('active');
            }
        });


        // ================================================
        // Move to the top of the page
        // ================================================
        $('#scrollTop').on('click', function (e) {
            e.preventDefault();
            $('html, body').animate({ scrollTop: 0}, 1000);
        });


        $('#search-text').keyup(function (e) {
            if (e.keyCode === 13)
                $('#search-button').click();
        });


        $('#search-button').click(function (e) {
            let text = $('#search-text').val();

            if (text.length < 64) {
                $.GetSearchBlockByHeight(text);
            } else if (text.length === 64) {
                $.GetSearchBlock(text);
            } else {
                $.wrongSearchAlert(text);
            }

            e.preventDefault();
        });


        if (donationAddress !== undefined && donationAddress !== "") {
            $('#donation').show();
            $('#donation-address').html(donationAddress);
        }

        $.fetchLiveStats(true);
    });

    $.pulseLiveUpdate = function () {
        let statsUpdate = $('stats-updated');

        statsUpdate.css({
            transition: 'opacity 100ms ease-out',
            opacity: 1
        });

        setTimeout(function () {
            statsUpdate.css({
                transition: 'opacity 7000ms linear',
                opacity: 0
            });
        }, 500);
    };


    $.fetchLiveStats = function (init = false) {
        $.ajax({
            url: api + '/info',
            dataType: 'json',
            type: 'GET',
            cache: 'false'
        }).done(function (data) {
            $.pulseLiveUpdate();
            lastStats = data;

            if (init) {
                appReady = true;
            }
            else {
                if (currentPage === 'home')
                    $.updateHome();

                if (currentPage === 'pool')
                    $.updatePool();
            }
        }).always(function () {
            setTimeout(function () {
                $.fetchLiveStats();
            }, refreshDelay);
        });
    };


    $.urlParam = function (name) {
        const results = new RegExp('[\?&]' + name + '=([^&#]*)').exec(window.location.href);
        if (results == null) {
            return null;
        } else {
            return results[1] || 0;
        }
    };


    $.localizeNumber = function(number) {
        return numberFormatter.format(number);
    };


    $.updateText = function(elementId, text){
        const el = $('#' + elementId);
        if (el.text() !== text){
            el.text(text);
        }
        return el;
    };


    $.updateTextLinkable = function(elementId, text){
        const el = $('#' + elementId);
        if (el.html() !== text){
            el.html(text);
        }
        return el;
    };


    $.renderDate = function (d) {
        return d.getFullYear() + '-' +
            ('0' + (d.getMonth() + 1)).slice(-2) + '-' +
            ('0' + d.getDate()).slice(-2) + ' ' +
            ('0' + d.getHours()).slice(-2) + ':' +
            ('0' + d.getMinutes()).slice(-2) + ':' +
            ('0' + d.getSeconds()).slice(-2);
    };


    $.formatDate = function(time){
        if (!time) return '';
        return $.renderDate(new Date(parseInt(time) * 1000));
    };


    $.formatBlockLink = function(hash){
        return '<a href="' + $.getBlockchainUrl(hash) + '">' + hash + '</a>';
    };


    $.formatPaymentLink = function(hash){
        return '<a href="' + $.getTransactionUrl(hash) + '">' + hash + '</a>';
    };


    $.getBlockchainUrl = function(id) {
        return blockchainExplorer.replace('{id}', id);
    };


    $.getTransactionUrl = function(id) {
        return transactionExplorer.replace('{symbol}', symbol.toLowerCase()).replace('{id}', id);
    };


    $.getReadableDifficultyString = function (difficulty, precision) {
        if (isNaN(parseFloat(difficulty)) || !isFinite(difficulty)) return 0;
        if (typeof precision === 'undefined') precision = 0;
        const units = ['', 'k', 'M', 'G', 'T', 'P'],
            number = Math.floor(Math.log(difficulty) / Math.log(1000));
        if (units[number] === undefined || units[number] === null) {
            return 0;
        }
        return $.localizeNumber((difficulty / Math.pow(1000, Math.floor(number))).toFixed(precision)) + ' ' + units[number];
    };


    $.getReadableHashRateString = function(hashrate){
        let i = 0;
        const byteUnits = [' H', ' kH', ' MH', ' GH', ' TH', ' PH', ' EH', ' ZH', ' YH' ];
        while (hashrate > 1000){
            hashrate = hashrate / 1000;
            i++;
        }
        return $.localizeNumber(hashrate.toFixed(2)) + byteUnits[i];
    };


    $.getReadableCoins = function(coins, digits, withoutSymbol) {
        //below "rounds".... we want to display the floor units to 2 decimals places. eg: 0.096 should be displayed as 0.09, not 0.1
        //var amount = (parseInt(coins || 0) / coinUnits).toFixed(digits || coinUnits.toString().length - 1);
        const fullAmount = parseInt(coins || 0) / coinUnits;
        const amountDollars = Math.floor(fullAmount);
        const fullAmountStr = "" + fullAmount;
        let amountCents = ""; //.substr(0, (digits || coinDisplayDecimals));
        if (fullAmountStr.indexOf(".") > -1) {
            //coin has decimals
            amountCents = fullAmountStr.substr(fullAmountStr.indexOf(".") + 1, fullAmountStr.length - fullAmountStr.indexOf(".") + 1);
            amountCents = amountCents.substr(0, (digits || coinDisplayDecimals));
            if (amountCents.length === 1) {
                amountCents = amountCents + "0";
            }
        } else {
            //no decimals
            amountCents = "00";
        }

        return $.localizeNumber(amountDollars) + "." + amountCents + (withoutSymbol ? '' : (' ' + symbol));
    };


    $.hex2a = function (hexx) {
        const hex = hexx.toString();
        let str = '';

        for (let i = 0; i < hex.length; i += 2) {
            str += String.fromCharCode(parseInt(hex.substr(i, 2), 16));
        }

        return str;
    };


    $.validHex = function(hex) {
        const exp = new RegExp("[0-9a-fA-F]{" + hex.length + "}");
        return exp.test(hex);
    };


    $.GetSearchBlockByHeight = function(text) {
        let block, xhrGetSearchBlockByHeight;
        if (xhrGetSearchBlockByHeight) xhrGetSearchBlockByHeight.abort();

        xhrGetSearchBlockByHeight = $.ajax({
            url: api + '/json_rpc',
            method: 'POST',
            data: JSON.stringify({
                jsonrpc: '2.0',
                id: 'blockbyheight',
                method: 'getblockheaderbyheight',
                params: {
                    height: parseInt(text)
                }
            }),
            dataType: 'json',
            cache: 'false',
            success: function (data) {
                if (data.result) {
                    block = data.result.block_header;
                    window.location.href = $.getBlockchainUrl(block.hash);
                } else if (data.error) {
                    $.wrongSearchAlert();
                }
            }
        });
    };


    $.GetSearchBlock = function(text) {
        let block, xhrGetSearchBlock;
        if (xhrGetSearchBlock) xhrGetSearchBlock.abort();
        xhrGetSearchBlock = $.ajax({
            url: api + '/json_rpc',
            method: 'POST',
            data: JSON.stringify({
                jsonrpc: '2.0',
                id: 'GetSearchBlock',
                method: 'f_block_json',
                params: {
                    hash: text
                }
            }),
            dataType: 'json',
            cache: 'false',
            success: function (data) {
                if (data.result) {
                    block = data.result.block;
                    sessionStorage.setItem('searchBlock', JSON.stringify(block));
                    window.location.href = $.getBlockchainUrl(block.hash);
                } else if (data.error) {
                    $.ajax({
                        url: api + '/json_rpc',
                        method: 'POST',
                        data: JSON.stringify({
                            jsonrpc: '2.0',
                            id: 'test',
                            method: 'f_transaction_json',
                            params: {
                                hash: text
                            }
                        }),
                        dataType: 'json',
                        cache: 'false',
                        success: function (data) {
                            if (data.result) {
                                sessionStorage.setItem('searchTransaction', JSON.stringify(data.result));
                                window.location.href = transactionExplorer.replace('{id}', text);
                            } else if (data.error) {
                                let xhrGetTsx = $.ajax({
                                    url: api + '/json_rpc',
                                    method: 'POST',
                                    data: JSON.stringify({
                                        jsonrpc: '2.0',
                                        id: 'test',
                                        method: 'k_transactions_by_payment_id',
                                        params: {
                                            payment_id: text
                                        }
                                    }),
                                    dataType: 'json',
                                    cache: 'false',
                                    success: function (data) {
                                        if (data.result) {
                                            let txsByPaymentId = data.result.transactions;
                                            sessionStorage.setItem('txsByPaymentId', JSON.stringify(txsByPaymentId));
                                            window.location.href = paymentIdExplorer.replace('{id}', text);
                                        } else if (data.error) {
                                            $('main').after(
                                                '<div class="alert alert-warning alert-dismissible fade in show" style="position: fixed; right: 50px; top: 50px;">' +
                                                '<button type="button" class="close" data-dismiss="alert" aria-hidden="true">&times;</button>' +
                                                'We could not find anything.' +
                                                '</div>');
                                        }
                                    }
                                });

                            }
                        }
                    });
                }
            }
        });
    };


    $.wrongSearchAlert = function() {
        $('main').after(
            '<div class="alert alert-danger alert-dismissible fade in show" style="position: fixed; right: 50px; top: 50px;">' +
            '<button type="button" class="close" data-dismiss="alert" aria-hidden="true">&times;</button>' +
            '<strong>Wrong search query!</strong><br /> Please enter block height or hash, transaction hash, or payment id.' +
            '</div>');
    };
})(jQuery);

