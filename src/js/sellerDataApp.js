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
        $(document).on('click', '.btn-register', App.getData);
    },

    getData: function(event) {
        event.preventDefault();
        var manufacturerCode = document.getElementById('manufacturerCode').value;
        
        if (!manufacturerCode) {
            alert("Please enter a manufacturer code");
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
                console.log("Querying sellers for manufacturer code:", manufacturerCode);
                return productInstance.querySellersList.call(web3.fromAscii(manufacturerCode), { from: account });
            }).then(function(result) {
                if (!result || result.length < 7) {
                    console.error("Invalid result format from querySellersList");
                    document.getElementById('logdata').innerHTML = "<tr><td colspan='7'>No sellers found or invalid data returned</td></tr>";
                    return;
                }

                var sellerId = [];
                var sellerName = [];
                var sellerBrand = [];
                var sellerCode = [];
                var sellerNum = [];
                var sellerManager = [];
                var sellerAddress = [];
                
                // Process each array in the result
                for(var k = 0; k < result[0].length; k++) {
                    sellerId[k] = result[0][k].toNumber(); // Convert BigNumber to regular number
                }

                for(var k = 0; k < result[1].length; k++) {
                    sellerName[k] = web3.toAscii(result[1][k]).replace(/\u0000/g, '');
                }

                for(var k = 0; k < result[2].length; k++) {
                    sellerBrand[k] = web3.toAscii(result[2][k]).replace(/\u0000/g, '');
                }

                for(var k = 0; k < result[3].length; k++) {
                    sellerCode[k] = web3.toAscii(result[3][k]).replace(/\u0000/g, '');
                }

                for(var k = 0; k < result[4].length; k++) {
                    sellerNum[k] = result[4][k].toNumber();
                }

                for(var k = 0; k < result[5].length; k++) {
                    sellerManager[k] = web3.toAscii(result[5][k]).replace(/\u0000/g, '');
                }

                for(var k = 0; k < result[6].length; k++) {
                    sellerAddress[k] = web3.toAscii(result[6][k]).replace(/\u0000/g, '');
                }

                var t = "";
                document.getElementById('logdata').innerHTML = t;
                var hasValidEntries = false;
                
                // Only process valid entries
                for(var i = 0; i < result[0].length; i++) {
                    if (sellerNum[i] === 0) continue; // Skip empty entries
                    
                    var tr = "<tr>";
                    tr += "<td>" + sellerId[i] + "</td>";
                    tr += "<td>" + sellerName[i] + "</td>";
                    tr += "<td>" + sellerBrand[i] + "</td>";
                    tr += "<td>" + sellerCode[i] + "</td>";
                    tr += "<td>" + sellerNum[i] + "</td>";
                    tr += "<td>" + sellerManager[i] + "</td>";
                    tr += "<td>" + sellerAddress[i] + "</td>";
                    tr += "</tr>";
                    t += tr;
                    hasValidEntries = true;
                }
                
                if (!hasValidEntries) {
                    document.getElementById('logdata').innerHTML = "<tr><td colspan='7'>No sellers found for this manufacturer</td></tr>";
                } else {
                    document.getElementById('logdata').innerHTML = t;
                }
                
                document.getElementById('add').innerHTML = account;
            }).catch(function(err) {
                console.error("Error querying sellers:", err);
                document.getElementById('logdata').innerHTML = "<tr><td colspan='7'>Error querying sellers. Please check the console for details.</td></tr>";
                alert("Error querying sellers. Please check if the manufacturer code is correct and try again.");
            });
        });
    }
};

$(function() {
    $(window).load(function() {
        App.init();
    });
});