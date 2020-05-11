(function ($) {
    let xhrGetTransaction;
    let transaction;

    $(function () {
        currentPage = 'transaction';
        let isReadyTransaction = setInterval(function () {
            if (appReady) {
                $.getTransaction();

                clearInterval(isReadyTransaction);
            }
        }, 10);
    });


    $.getTransaction = function () {
        if (xhrGetTransaction) xhrGetTransaction.abort();
        const searchTx = $.parseJSON(sessionStorage.getItem('searchTransaction'));
        if (searchTx) {
            $.renderTransaction(searchTx);
        } else {
            xhrGetTransaction = $.ajax({
                url: api + '/json_rpc',
                method: 'POST',
                data: JSON.stringify({
                    jsonrpc: '2.0',
                    id: 'test',
                    method: 'f_transaction_json',
                    params: {
                        hash: $.urlParam('hash')
                    }
                }),
                dataType: 'json',
                cache: 'false',
                success: function (data) {
                    const tx = data.result;
                    if (!data.error || data.error.message === "") {
                        $.renderTransaction(tx);
                    } else {
                        //try get the Tx from the Mempool
                        $.ajax({
                            url: api + '/get_transaction_details_by_hashes',
                            method: 'POST',
                            data: JSON.stringify({
                                transactionHashes: [$.urlParam("hash")]
                            }),
                            dataType: 'json',
                            cache: 'false',
                            success: function (data) {
                                const tx = data.transactions[0];
                                if (data.status === "OK") {
                                    $.renderMemPoolTransaction(tx);
                                } else {
                                    //try get the Tx from the Mempool
                                    console.log(data.status);
                                    alert(data.status);
                                }
                            }
                        });
                    }
                }
            });
        }
        sessionStorage.removeItem('searchTransaction');
    };


    $.renderTransaction = function (transaction) {
        const details = transaction.txDetails;
        inputs = transaction.tx.vin;
        outputs = transaction.tx.vout;
        block = transaction.block;

        $.updateText('transaction-hash', details.hash);
        if (block.hash) {
            $('#confirmations').removeClass('d-none');
            $.updateText('transaction-confirmations', $.localizeNumber(lastStats.height - block.height));
            $.updateText('transaction-timestamp', $.formatDate(block.timestamp));
            // $(".transaction-timeago").timeago('update', new Date(block.timestamp * 1000).toISOString());
        }
        $.updateText('transaction-amount_out', $.getReadableCoins(details.amount_out));
        $.updateText('transaction-fee', $.getReadableCoins(details.fee));
        $.updateText('transaction-mixin', details.mixin);
        /*
        if (!details.mixin)
            $('#div_transaction_mixin').addClass('d-none');
        */
        $.updateText('transaction-paymentId', details.paymentId);
        $.updateText('transaction-paymentIdDecipher', $.hex2a(details.paymentId));

        if (!details.paymentId) {
            $('#div_transaction_paymentId').addClass('d-none');
            //$('#div_transaction_paymentIdDecipher').addClass('d-none');
        }

        $.updateText('transaction-size', $.localizeNumber(details.size));

        if (!block.hash) {
            $('#tx_block').addClass('d-none');
            $('#tx_unconfirmed').removeClass('d-none');
        }

        $.updateTextLinkable('block-hash', $.formatBlockLink(block.hash));
        $.updateText('block-height', $.localizeNumber(block.height));
        $.updateText('block-timestamp', $.formatDate(block.timestamp));

        $.renderInputs(inputs);
        $.renderOutputs(outputs);
    };


    $.renderMemPoolTransaction = function (transaction) {
        inputs = transaction.inputs;
        outputs = transaction.outputs;

        $.updateText('transaction-hash', transaction.hash);
        if (transaction.inBlockchain) {
            $('#confirmations').removeClass('d-none');
            $.updateText('transaction-confirmations', $.localizeNumber(lastStats.height - transaction.blockIndex));
            $.updateText('transaction-timestamp', $.formatDate(transaction.timestamp));
            //$(".transaction-timeago").timeago('update', new Date(transaction.timestamp * 1000).toISOString());
        } else {
            //$(".transaction-timeago").timeago('update', new Date(transaction.timestamp * 1000).toISOString());
        }
        $.updateText('transaction-amount_out', $.getReadableCoins(transaction.totalOutputsAmount));
        $.updateText('transaction-fee', $.getReadableCoins(transaction.fee));
        $.updateText('transaction-mixin', transaction.mixin);
        /*
        if (!transaction.mixin)
            $('#div_transaction_mixin').addClass('d-none');
        */
        $.updateText('transaction-paymentId', transaction.paymentId === '0000000000000000000000000000000000000000000000000000000000000000' ? '' : transaction.paymentId);
        $.updateText('transaction-paymentIdDecipher', $.hex2a(transaction.paymentId));

        if (!transaction.paymentId || transaction.paymentId === '0000000000000000000000000000000000000000000000000000000000000000') {
            $('#div_transaction_paymentId').addClass('d-none');
            $('#div_transaction_paymentIdDecipher').addClass('d-none');
        }

        $.updateText('transaction-size', $.localizeNumber(transaction.size));

        if (!transaction.inBlockchain) {
            $('#tx_block').addClass('d-none');
            $('#tx_unconfirmed').removeClass('d-none');
        }

        $.renderMemPoolInputs(inputs);
        $.renderMemPoolOutputs(outputs);
    };


    $.sortInputs = function(inputs) {
        return inputs.sort((a, b)=> a['value'].amount - b['value'].amount)
    }


    $.renderInputs = function (inputResults) {
        const $inputsRows = $('#inputs-rows');
        inputResults = $.sortInputs(inputResults);

        for (let i = 0; i < inputResults.length; i++) {
            let input = inputResults[i];

            if (!input.value.amount)
                continue;

            let inputJson = JSON.stringify(input);
            let existingRow = document.getElementById('inputRow' + input.value.k_image);

            if (existingRow && existingRow.getAttribute('data-json') !== inputJson) {
                $(existingRow).replaceWith($.getInputRowElement(input, inputJson));
            } else if (!existingRow) {

                let inputElement = $.getInputRowElement(input, inputJson);
                $inputsRows.append(inputElement);
            }
        }

        $.updateText('inputs-count', document.querySelectorAll('#inputs-rows tr').length);
    };


    $.renderOutputs = function (outputResults) {
        const $outputsRows = $('#outputs-rows');

        for (let i = 0; i < outputResults.length; i++) {
            let output = outputResults[i];
            let outputJson = JSON.stringify(output);
            let existingRow = document.getElementById('outputRow' + output.target.data.key);

            if (existingRow && existingRow.getAttribute('data-json') !== outputJson) {
                $(existingRow).replaceWith($.getOutputRowElement(output, outputJson));
            } else if (!existingRow) {

                let outputElement = $.getOutputRowElement(output, outputJson);
                $outputsRows.append(outputElement);
            }
        }

        $.updateText('outputs-count', document.querySelectorAll('#outputs-rows tr').length);
    };


    $.getInputRowElement = function (input, jsonString) {
        const row = document.createElement('tr');
        row.setAttribute('data-json', jsonString);
        row.setAttribute('data-k_image', input.value.k_image);
        row.setAttribute('id', 'inputRow' + input.value.k_image);

        row.innerHTML = $.getInputCells(input);

        return row;
    };


    $.getOutputRowElement = function (output, jsonString) {
        let row = document.createElement('tr');
        row.setAttribute('data-json', jsonString);
        row.setAttribute('data-k_image', output.target.data.key);
        row.setAttribute('id', 'outputRow' + output.target.data.key);

        row.innerHTML = $.getOutputCells(output);

        return row;
    };


    $.getInputCells = function (input) {
        return '<th scope="row">' + $.getReadableCoins(input.value.amount) + '</th>' +
            '<td class="image-code">' + input.value.k_image + '</td>';
    };


    $.getOutputCells = function (output) {
        return '<th scope="row">' + $.getReadableCoins(output.amount) + '</th>' +
            '<td class="key-code">' + output.target.data.key + '</td>';
    };


    $.renderMemPoolInputs = function (inputResults) {
        let $inputsRows = $('#inputs-rows');

        for (let i = 0; i < inputResults.length; i++) {
            let input = inputResults[i].data;

            if (!input.input.amount)
                continue;

            let newInput = {
                "type": input.type,
                "value": {
                    "amount": input.input.amount,
                    "k_image": input.input.k_image,
                    "key_offsets": input.input.key_offsets
                }
            };
            let inputJson = JSON.stringify(newInput);
            let existingRow = document.getElementById('inputRow' + newInput.value.k_image);

            if (existingRow && existingRow.getAttribute('data-json') !== inputJson) {
                $(existingRow).replaceWith($.getInputRowElement(newInput, inputJson));
            } else if (!existingRow) {
                let inputElement = $.getInputRowElement(newInput, inputJson);
                $inputsRows.append(inputElement);
            }
        }

        $.updateText('inputs-count', document.querySelectorAll('#inputs-rows tr').length);
    };


    $.renderMemPoolOutputs = function (outputResults) {
        let $outputsRows = $('#outputs_rows');

        for (let i = 0; i < outputResults.length; i++) {
            let output = outputResults[i].output;
            let newOutput = {"amount": output.amount, "target": output.target};
            let outputJson = JSON.stringify(newOutput);
            let existingRow = document.getElementById('outputRow' + newOutput.target.data.key);

            if (existingRow && existingRow.getAttribute('data-json') !== outputJson) {
                $(existingRow).replaceWith($.getOutputRowElement(newOutput, outputJson));
            } else if (!existingRow) {
                let outputElement = $.getOutputRowElement(newOutput, outputJson);
                $outputsRows.append(outputElement);
            }
        }

        $.updateText('outputs-count', document.querySelectorAll('#outputs-rows tr').length);
    };
})(jQuery);
