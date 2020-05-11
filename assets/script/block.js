(function ($) {
    let xhrGetBlock;
    let block;

    $(function () {
        currentPage = 'block';
        let isReadyBlock = setInterval(function() {
            if (appReady) {
                $.getBlock();

                clearInterval(isReadyBlock);
            }
        }, 10);
    });


    $.getBlock = function(){
        if (xhrGetBlock) xhrGetBlock.abort();
        const searchBlk = $.parseJSON(sessionStorage.getItem('searchBlock'));
        if (searchBlk) {
            $.renderBlock(searchBlk);
        } else {
            xhrGetBlock = $.ajax({
                url: api + '/json_rpc',
                method: 'POST',
                data: JSON.stringify({
                    jsonrpc: '2.0',
                    id: 'getBlock',
                    method:'f_block_json',
                    params: {
                        hash: $.urlParam('hash')
                    }
                }),
                dataType: 'json',
                cache: 'false',
                success: function(data){
                    block = data.result.block;
                    $.renderBlock(block);
                }
            });
        }
        sessionStorage.removeItem('searchBlock');
    };


    $.renderBlock = function(block){
        $.updateText('block-hash', block.hash);
        $.updateText('block-height', $.localizeNumber(block.height));
        $.updateText('block-timestamp', $.formatDate(block.timestamp));
        $.updateText('block-version', block.major_version + '.' + block.minor_version);
        $.updateText('block-difficulty', $.localizeNumber(block.difficulty));
        $.updateText('block-orphan', block.orphan_status ? "YES" : "NO");
        $.updateText('block-transactions', block.transactions.length);
        $.updateText('block-transactionsSize', $.localizeNumber(block.transactionsCumulativeSize));
        $.updateText('block-blockSize', $.localizeNumber(block.blockSize));
        $.updateText('block-currentTxsMedian', $.localizeNumber(block.sizeMedian));
        $.updateText('block-effectiveTxsMedian', $.localizeNumber(block.effectiveSizeMedian));
        $.updateText('block-rewardPenalty', block.penalty*100 + "%");
        $.updateText('block-baseReward', $.getReadableCoins(block.baseReward));
        $.updateText('block-transactionsFee', $.getReadableCoins(block.totalFeeAmount));
        $.updateText('block-reward', $.getReadableCoins(block.reward));
        $.updateText('block-totalCoins', $.getReadableCoins(block.alreadyGeneratedCoins));
        $.updateText('block-totalTransactions', $.localizeNumber(block.alreadyGeneratedTransactions));
        $.renderTransactions(block.transactions);

        $.makePrevBlockLink(block.prev_hash);

        $.ajax({
            url: api + '/json_rpc',
            method: 'POST',
            data: JSON.stringify({
                jsonrpc: '2.0',
                id: 'test',
                method: 'getblockheaderbyheight',
                params: {
                    height: (block.height + 1)
                }
            }),
            dataType: 'json',
            cache: 'false',
            success: function(data){
                if(data.result){
                    let nextBlockHash = data.result.block_header.hash;

                    if(nextBlockHash) {
                        $.makeNextBlockLink(nextBlockHash);
                    }
                }
            },
            error: function (ajaxContext) {
            }
        });
    };


    $.renderTransactions = function(transactionResults){
        let $transactionsRows = $('#transactions-rows');

        for (let i = 0; i < transactionResults.length; i++){
            let transaction = transactionResults[i];
            let transactionJson = JSON.stringify(transaction);
            let existingRow = document.getElementById('transactionRow' + transaction.hash);
            if (existingRow && existingRow.getAttribute('data-json') !== transactionJson){
                $(existingRow).replaceWith($.getTransactionRowElement(transaction, transactionJson));
            }
            else if (!existingRow){
                let transactionElement = $.getTransactionRowElement(transaction, transactionJson);
                $transactionsRows.append(transactionElement);
            }
        }
    };


    $.getTransactionRowElement = function(transaction, jsonString){
        let row = document.createElement('tr');
        row.setAttribute('data-json', jsonString);
        row.setAttribute('data-hash', transaction.hash);
        row.setAttribute('id', 'transactionRow' + transaction.hash);

        row.innerHTML = $.getTransactionCells(transaction);

        return row;
    };


    $.getTransactionCells = function(transaction){
        return '<th scope="row" class="hash-code">' + $.formatPaymentLink(transaction.hash) + '</th>' +
            '<td>' + $.getReadableCoins(transaction.fee, 4, true) + '</td>' +
            '<td>' + $.getReadableCoins(transaction.amount_out, 4, true) + '</td>' +
            '<td>' + $.localizeNumber(transaction.size) + '</td>';
    };


    $.makeNextBlockLink = function(blockHash){
        $('#block_height').append(' <a href="' + $.getBlockchainUrl(blockHash) + '" title="Next block"><i class="fa fa-chevron-circle-right" aria-hidden="true"></i></a>');
    };


    $.makePrevBlockLink = function(blockHash){
        $('#block_height').prepend('<a href="' + $.getBlockchainUrl(blockHash) + '" title="Previous block"><i class="fa fa-chevron-circle-left" aria-hidden="true"></i></a> ');
    };
})(jQuery);
