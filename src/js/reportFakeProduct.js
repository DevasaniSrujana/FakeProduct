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
            
            // Load any existing reports for the product
            App.loadReports();
        });

        return App.bindEvents();
    },

    bindEvents: function() {
        $(document).on('click', '#submit-report', App.submitReport);
    },

    submitReport: function(event) {
        event.preventDefault();

        var productSN = document.getElementById('productSN').value;
        var reporterCode = document.getElementById('reporterCode').value;
        var description = document.getElementById('description').value;

        if (!productSN || !reporterCode || !description) {
            alert("Please fill in all fields");
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
                return productInstance.reportFakeProduct(
                    web3.fromAscii(productSN),
                    web3.fromAscii(reporterCode),
                    web3.fromAscii(description),
                    { from: account }
                );
            }).then(function(result) {
                alert("Report submitted successfully!");
                // Clear the form
                document.getElementById('productSN').value = '';
                document.getElementById('reporterCode').value = '';
                document.getElementById('description').value = '';
                // Reload reports
                App.loadReports();
            }).catch(function(err) {
                console.error("Error submitting report:", err);
                alert("Error submitting report. Please check if the product serial number is valid.");
            });
        });
    },

    loadReports: function() {
        var productSN = document.getElementById('productSN').value;
        if (!productSN) return;

        var productInstance;
        web3.eth.getAccounts(function(error, accounts) {
            if(error) {
                console.log(error);
                return;
            }

            var account = accounts[0];
            
            App.contracts.product.deployed().then(function(instance) {
                productInstance = instance;
                return productInstance.getProductReports.call(web3.fromAscii(productSN), { from: account });
            }).then(function(result) {
                var reportIds = result[0];
                var reporters = result[1];
                var descriptions = result[2];
                var statuses = result[3];
                var timestamps = result[4];

                var tbody = document.getElementById('reportStatus');
                var html = '';

                for(var i = 0; i < reportIds.length; i++) {
                    if (reportIds[i].toNumber() === 0 && i > 0) break;

                    var date = new Date(timestamps[i].toNumber() * 1000);
                    html += '<tr>';
                    html += '<td>' + reportIds[i].toNumber() + '</td>';
                    html += '<td>' + productSN + '</td>';
                    html += '<td>' + web3.toAscii(descriptions[i]).replace(/\u0000/g, '') + '</td>';
                    html += '<td>' + web3.toAscii(statuses[i]).replace(/\u0000/g, '') + '</td>';
                    html += '<td>' + date.toLocaleString() + '</td>';
                    html += '</tr>';
                }

                if (html === '') {
                    html = '<tr><td colspan="5">No reports found for this product</td></tr>';
                }

                tbody.innerHTML = html;
            }).catch(function(err) {
                console.error("Error loading reports:", err);
            });
        });
    }
};

$(function() {
    $(window).load(function() {
        App.init();
    });

    // Add event listener for productSN input changes
    $('#productSN').on('change', function() {
        App.loadReports();
    });
}); 