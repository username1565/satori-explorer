(function ($) {
    let xhrGetBlocks;
    let poolStats = [];
    let difficulties = [];
    let poolsChart = null;
    let totalHashrate = 0;
    let totalMiners = 0;
    let lastReward = 0;
    let avgDiff = 0;
    let networkNodes;

    $(function () {
        currentPage = 'nodes';
        let isReadyNodes = setInterval(function() {
            if (appReady) {
                $.getJSON(
                    'https://raw.githubusercontent.com/cirquity/cirquity-node-list/master/cirquity-nodes.json',
                    function( data ) {
                        networkNodes = data['nodes'];
                        $.initNodes();
                    }
                );

                clearInterval(isReadyNodes);
            }
        }, 10);
    });

    $.initNodes = function() {
        networkNodes.forEach(function (data) {
            const url = data.url;
            const port = data.port;
            const name = data.name;
            const ssl = data.ssl;
            let host = url + ':' + port;
            let scheme = 'http://';

            if (ssl) {
                scheme = 'https://';
                host = url;
            }

            $.getJSON('/api/node/?url=' + encodeURIComponent(scheme + host + '/info'), function (data, textStatus, jqXHR) {
                const d = $.formatDate(data.start_time);
                $('#nodes-rows').append($.renderNodeRow(name, host, data, d));
            });
        });

        setInterval(function () {
            $('#nodes-rows').empty();

            networkNodes.forEach(function (data) {
                const url = data.url;
                const port = data.port;
                const name = data.name;
                const ssl = data.ssl;
                let host = url + ':' + port;
                let scheme = 'http://';

                if (ssl) {
                    scheme = 'https://';
                    host = url;
                }

                $.getJSON('/api/node/?url=' + encodeURIComponent(scheme + host + '/info'), function (data, textStatus, jqXHR) {
                    const d = $.formatDate(data.start_time);
                    $('#nodes-rows').append($.renderNodeRow(name, host, data, d));
                });
            });
        }, 120000);

        // $.updatePool();
    };


    $.renderNodeRow = function (name, host, data, d) {
        let nodes_row = [];

        nodes_row.push('<tr>');
        nodes_row.push('<th scope="row">' + name + '</th>');
        nodes_row.push('<td><code>' + host + '</code></td>');
        nodes_row.push('<td>' + data.version + '</td>');
        nodes_row.push('<td>' + data.height + '</td>');
        nodes_row.push('<td class="text-center">' + data.incoming_connections_count + ' / ' + data.outgoing_connections_count + '</td>');
        nodes_row.push('<td>' + d + '</td>');
        nodes_row.push('</tr>');

        return nodes_row.join('');
    };
})(jQuery);