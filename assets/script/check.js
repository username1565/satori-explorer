(function ($) {
    let transactionHash = $('#transaction-hash');
    let privateKey = $('#private-key');
    let publicAddress = $('#public-address');
    let txnLink = $('#txn-link');
    let outputsRow = $('#outputs-rows');
    let getTxnRequest;
    let coinUtils = new TurtleCoinUtils.CryptoNote({
        "coinUnitPlaces": 2,
        "addressPrefix": 3934293,
        "keccakIterations": 1,
        "defaultNetworkFee": 10,
        "fusionMinInputCount": 12,
        "fusionMinInOutCountRatio": 4,
        "mmMiningBlockVersion": 2,
        "maximumOutputAmount": 100000000000,
        "maximumOutputsPerTransaction": 90,
        "maximumExtraSize": 1024,
        "activateFeePerByteTransactions": false,
        "feePerByte": 1.953125,
        "feePerByteChunkSize": 256
    });

    $(function () {
        currentPage = 'check';
        let isReadyCheck = setInterval(function() {
            if (appReady) {
                clearInterval(isReadyCheck);
            }
        }, 10);

        $('#check-transaction').click(function () {
            $.getTxn(transactionHash.val(), function (response) {
                if (response.error) {
                    //TODO proper error display
                    alert(response.error.message);
                } else {
                    const privateKeyType = 'view';
                    const results = $.checkTxn(response.result, privateKey.val(), publicAddress.val(), privateKeyType);
                    if (results.error) {
                        txnLink.attr('href', '');
                        txnLink.html('?');
                        //TODO proper error display
                        alert(results.error);
                    } else {
                        txnLink.attr('href', 'transaction.html?hash=' + transactionHash.val());
                        txnLink.html(transactionHash.val());
                        outputsRow.html('');

                        for (let o in results.owned) {
                            if (results.owned.hasOwnProperty(o)) {
                                let owned = results.owned[o];
                                let row = "<tr><td>" + owned[2] + "</td><td>" + owned[1] + "</td></tr>";
                                outputsRow.append(row);
                            }
                        }
                    }
                }
            });
        });
    });
    
    
    $.getTxn = function(transactionHash, cb) {
        if (getTxnRequest) { getTxnRequest.abort(); }

        getTxnRequest = $.ajax({
            url: api + '/json_rpc',
            method: 'POST',
            data: JSON.stringify({
                jsonrpc: '2.0',
                id: "blockexplorer",
                method: 'f_transaction_json',
                params: {
                    hash: transactionHash
                }
            }),
            dataType: 'json',
            error: function (resp) {
                alert(resp.error);
            },
            success: cb
        });
    };
    
    
    $.checkTxn = function(transactionResponse, privateKey, address, privateKeyType) {
        let txn = transactionResponse.tx;
        let txDetails = transactionResponse.txDetails;
        let addrHex = coinUtils.decodeAddress(address);
        let hash = txDetails.hash;
        let results = {
            error: false,
            total_owned: 0,
            owned: [],
            unowned: [],
        };
        console.log(addrHex);
        let s = 8, m = s + 64, e = m + 64; //offsets
        if (privateKey.length !== 64 || $.validHex(privateKey) !== true) {
            results.error = "Invalid private key";
        } else if (address.length !== 99 || (addrHex.slice(-s) !== cn_fast_hash(addrHex.slice(0, -s)).slice(0, s))) {
            results.error = "Bad address";
        } else if (privateKeyType === 'view' && addrHex.slice(m, e) !== sec_key_to_pub(privateKey)) {
            results.error = "Secret View key does not match address";
        } else if (hash.length !== 64 || !$.validHex(hash)) {
            results.error = "Invalid TXN Hash";
        } else {
            let pub = addrHex.slice(m, e);

            if (privateKeyType === "view") {
                pub = $.pubKeyFromExtra(txn.extra);
            }

            if (!pub) {
                results.error = "Unrecognized tx_extra format!";
            } else {
                let der = cnUtil.generate_key_derivation(pub, privateKey);
                let spk = addrHex.slice(s, m);

                console.log(der, spk);

                for (let i = 0; i < txn.vout.length; i++) {
                    let pubkey = cnUtil.derive_public_key(der, i, spk);
                    let amount = txn.vout[i].amount / 100000000;
                    if (pubkey === txn.vout[i].target.data.key) {
                        results.total_owned += amount;
                        results.owned.push([i, pubkey, amount]);
                    } else {
                        results.unowned.push([i, txn.vout[i].target.key, amount]);
                    }
                }

            }
        }

        console.log(results);

        return results;
    };


    $.pubKeyFromExtra = function(bin) {
        let pub = false;
        console.log(bin, bin.length, bin[0]);
        while (bin.length > 0 && bin[0] === 0) {
            bin = bin.slice(1, bin.length);
        }
        if (bin[0] === 1 && bin.length >= 65) {
            pub = bin.slice(1, 65);
        }
        return pub;
    };
})(jQuery);