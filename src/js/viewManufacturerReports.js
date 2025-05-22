App = {
    web3Provider: null,
    contracts: {},

    init: async function() {
        return await App.initWeb3();
    },

    initWeb3: async function () {
        if (window.ethereum) {
            App.web3Provider = window.ethereum;
            web3 = new Web3(window.ethereum);
            await window.ethereum.request({ method: "eth_requestAccounts" });
        } else {
            alert("Please install MetaMask!");
            return;
        }
    
        return App.initContract();
    },
    
    initContract: function() {
        $.getJSON('product.json', function(data) {
            var productArtifact = data;
            App.contracts.product = TruffleContract(productArtifact);
            App.contracts.product.setProvider(App.web3Provider);
        });

        return App.bindEvents();
    },

    bindEvents: function() {
        $(document).on('click', '#load-reports', App.loadReports);
        $(document).on('click', '.update-status', App.updateReportStatus);
    },

    loadReports: function(event) {
        if (event) {
            event.preventDefault();
        }

        var manufacturerCode = document.getElementById('manufacturerCode').value;
        if (!manufacturerCode) {
            alert("Please enter manufacturer code");
            return;
        }

        var productInstance;
        web3.eth.getAccounts(function(error, accounts) {
            if(error) {
                console.log(error);
                alert("Error getting Ethereum accounts. Please check if MetaMask is connected.");
                return;
            }

            var account = accounts[0];
            
            App.contracts.product.deployed().then(function(instance) {
                productInstance = instance;
                return productInstance.getManufacturerReports.call(web3.fromAscii(manufacturerCode), { from: account });
            }).then(function(result) {
                var reportIds = result[0];
                var productSNs = result[1];
                var descriptions = result[2];
                var statuses = result[3];
                var timestamps = result[4];

                var tbody = document.getElementById('reportsList');
                var html = '';

                for(var i = 0; i < reportIds.length; i++) {
                    if (reportIds[i].toNumber() === 0 && i > 0) break;

                    var date = new Date(timestamps[i].toNumber() * 1000);
                    var status = web3.toAscii(statuses[i]).replace(/\u0000/g, '');
                    
                    html += '<tr>';
                    html += '<td>' + reportIds[i].toNumber() + '</td>';
                    html += '<td>' + web3.toAscii(productSNs[i]).replace(/\u0000/g, '') + '</td>';
                    html += '<td>' + web3.toAscii(descriptions[i]).replace(/\u0000/g, '') + '</td>';
                    html += '<td>' + status + '</td>';
                    html += '<td>' + date.toLocaleString() + '</td>';
                    html += '<td>';
                    if (status === "Pending") {
                        html += '<button class="btn btn-info update-status" data-report-id="' + reportIds[i].toNumber() + '" data-status="Investigating">Start Investigation</button> ';
                    } else if (status === "Investigating") {
                        html += '<button class="btn btn-success update-status" data-report-id="' + reportIds[i].toNumber() + '" data-status="Resolved">Mark as Resolved</button> ';
                    }
                    html += '</td>';
                    html += '</tr>';
                }

                if (html === '') {
                    html = '<tr><td colspan="6">No reports found for this manufacturer</td></tr>';
                }

                tbody.innerHTML = html;
            }).catch(function(err) {
                console.error("Error loading reports:", err);
                alert("Error loading reports. Please check if the manufacturer code is valid.");
            });
        });
    },

    updateReportStatus: function(event) {
        event.preventDefault();
        var reportId = $(event.target).data('report-id');
        var newStatus = $(event.target).data('status');
        var manufacturerCode = document.getElementById('manufacturerCode').value;

        if (!manufacturerCode) {
            alert("Please enter manufacturer code");
            return;
        }

        var productInstance;
        web3.eth.getAccounts(function(error, accounts) {
            if(error) {
                console.log(error);
                alert("Error getting Ethereum accounts. Please check if MetaMask is connected.");
                return;
            }

            var account = accounts[0];
            
            App.contracts.product.deployed().then(function(instance) {
                productInstance = instance;
                return productInstance.updateReportStatus(
                    reportId,
                    web3.fromAscii(newStatus),
                    web3.fromAscii(manufacturerCode),
                    { from: account }
                );
            }).then(function(result) {
                alert("Report status updated successfully!");
                App.loadReports();
            }).catch(function(err) {
                console.error("Error updating report status:", err);
                alert("Error updating report status. Please check if you are the manufacturer of this product.");
            });
        });
    }
};

$(function() {
    $(window).load(function() {
        App.init();
    });
}); 