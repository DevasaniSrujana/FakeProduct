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
        $(document).on('click', '.btn-register', App.registerManufacturer);
    },

    registerManufacturer: function(event) {
        event.preventDefault();

        var manufacturerName = document.getElementById('manufacturerName').value;
        var manufacturerBrand = document.getElementById('manufacturerBrand').value;
        var manufacturerCode = document.getElementById('manufacturerCode').value;
        var manufacturerPhone = document.getElementById('manufacturerPhone').value;
        var manufacturerManager = document.getElementById('manufacturerManager').value;
        var manufacturerAddress = document.getElementById('manufacturerAddress').value;

        if (!manufacturerName || !manufacturerBrand || !manufacturerCode || 
            !manufacturerPhone || !manufacturerManager || !manufacturerAddress) {
            $('#registrationStatus').html('<div class="alert alert-danger">Please fill in all fields</div>');
            return;
        }

        web3.eth.getAccounts(function(error, accounts) {
            if (error) {
                console.log(error);
                return;
            }

            var account = accounts[0];

            App.contracts.product.deployed().then(function(instance) {
                return instance.registerManufacturer(
                    web3.fromAscii(manufacturerName),
                    web3.fromAscii(manufacturerBrand),
                    web3.fromAscii(manufacturerCode),
                    parseInt(manufacturerPhone),
                    web3.fromAscii(manufacturerManager),
                    web3.fromAscii(manufacturerAddress),
                    {from: account}
                );
            }).then(function(result) {
                $('#registrationStatus').html(
                    '<div class="alert alert-success">Registration successful! Your Manufacturer ID is: ' + 
                    manufacturerCode + '</div>'
                );
                
                // Clear the form
                document.getElementById('manufacturerName').value = '';
                document.getElementById('manufacturerBrand').value = '';
                document.getElementById('manufacturerCode').value = '';
                document.getElementById('manufacturerPhone').value = '';
                document.getElementById('manufacturerManager').value = '';
                document.getElementById('manufacturerAddress').value = '';
            }).catch(function(err) {
                console.log(err.message);
                $('#registrationStatus').html(
                    '<div class="alert alert-danger">Registration failed. ' + 
                    (err.message.includes('exists') ? 'Manufacturer code already exists.' : 'Please try again.') + 
                    '</div>'
                );
            });
        });
    }
};

$(function() {
    $(window).load(function() {
        App.init();
    });
}); 