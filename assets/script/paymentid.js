(function ($) {
    let paymentId;
    let xhrGetTsx;
    let txsByPaymentId;
    
    $(function () {
        currentPage = 'payment';
        let isReadyBlock = setInterval(function() {
            if (appReady) {
                paymentId = $.urlParam('hash');
                $.updateText('payment-id', paymentId);
                $.getTransactions();
                
                clearInterval(isReadyBlock);
            }
        }, 10);
    });
    
    $.getTransactions = function(){
        if (xhrGetTsx) xhrGetTsx.abort();

        txsByPaymentId = $.parseJSON(sessionStorage.getItem('txsByPaymentId'));

        if (txsByPaymentId) {
            $.renderPaymentTransactions(txsByPaymentId);
        } else {
            xhrGetTsx = $.ajax({
                url: api + '/json_rpc',
                method: 'POST',
                data: JSON.stringify({
                    jsonrpc: '2.0',
                    id: 'paymentId',
                    method:"k_transactions_by_payment_id",
                    params: {
                        payment_id: paymentId
                    }
                }),
                dataType: 'json',
                cache: 'false',
                success: function(data){
                    let txs = data.result.transactions;
                    $.renderPaymentTransactions(txs);
                }
            });
        }
        sessionStorage.removeItem('txsByPaymentId');
    };
    
    
    $.renderPaymentTransactions = function(transactionResults){
        let $transactionsRows = $('#transactions-rows');

        for (let i = 0; i < transactionResults.length; i++){
            let transaction = transactionResults[i];
            let transactionJson = JSON.stringify(transaction);
            let existingRow = document.getElementById('transactionRow' + transaction.hash);

            if (existingRow && existingRow.getAttribute('data-json') !== transactionJson){
                $(existingRow).replaceWith($.getPaymentTransactionRowElement(transaction, transactionJson));
            }
            else if (!existingRow){
                let transactionElement = $.getPaymentTransactionRowElement(transaction, transactionJson);
                $transactionsRows.append(transactionElement);
            }
        }
    };


    $.getPaymentTransactionRowElement = function(transaction, jsonString){
        let row = document.createElement('tr');
        row.setAttribute('data-json', jsonString);
        row.setAttribute('data-hash', transaction.hash);
        row.setAttribute('id', 'transactionRow' + transaction.hash);

        row.innerHTML = $.getPaymentTransactionCells(transaction);

        return row;
    };


    $.getPaymentTransactionCells = function(transaction){
        return '<th scope="row">' + $.formatPaymentLink(transaction.hash) + '</th>' +
            '<td>' + $.getReadableCoins(transaction.fee, 4, true) + '</td>' +
            '<td>' + $.getReadableCoins(transaction.amount_out, 4, true) + '</td>' +
            '<td>' + $.localizeNumber(transaction.size) + '</td>';
    };
})(jQuery);