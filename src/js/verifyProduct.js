// Debug flag
const DEBUG = true;

// Debug logging function
function debug(message, data = null) {
    if (DEBUG) {
        if (data) {
            console.log(`[Debug] ${message}:`, data);
        } else {
            console.log(`[Debug] ${message}`);
        }
    }
}

App = {
    web3Provider: null,
    contracts: {},
    account: null,
    web3: null,

    init: async function() {
        debug('App.init() called');
        try {
            await App.loadWeb3();
            await App.initWeb3();
            await App.initContract();
            debug('App initialization completed');
            return true;
        } catch (error) {
            console.error('Initialization failed:', error);
            document.getElementById('logdata').innerHTML = `<tr><td>Error: ${error.message}</td></tr>`;
            return false;
        }
    },

    loadWeb3: async function() {
        debug('loadWeb3() called');
        return new Promise((resolve, reject) => {
            // Check if Web3 has been injected by MetaMask
            if (typeof window.ethereum !== 'undefined') {
                debug('MetaMask is installed');
                
                // Load Web3 script dynamically
                const script = document.createElement('script');
                script.src = 'https://cdn.jsdelivr.net/npm/web3@1.5.2/dist/web3.min.js';
                script.async = true;
                
                script.onload = () => {
                    debug('Web3 script loaded successfully');
                    resolve();
                };
                
                script.onerror = () => {
                    reject(new Error('Failed to load Web3 script'));
                };
                
                document.head.appendChild(script);
            } else {
                reject(new Error('Please install MetaMask to use this application!'));
            }
        });
    },

    initWeb3: async function () {
        debug('initWeb3() called');
        return new Promise(async (resolve, reject) => {
            try {
                // Wait for Web3 to be defined
                let retries = 0;
                const maxRetries = 10;
                const retryInterval = 500; // 500ms

                while (retries < maxRetries) {
                    if (typeof Web3 !== 'undefined') {
                        try {
                            App.web3Provider = window.ethereum;
                            App.web3 = new Web3(window.ethereum);
                            
                            // Verify Web3 instance and utilities
                            if (App.web3 && App.web3.utils && App.web3.utils.asciiToHex) {
                                window.web3 = App.web3;
                                debug('Web3 initialized successfully', {
                                    version: App.web3.version,
                                    utils: Object.keys(App.web3.utils)
                                });
                                
                                // Request account access
                                debug('Requesting account access');
                                const accounts = await window.ethereum.request({ 
                                    method: 'eth_requestAccounts' 
                                });
                                
                                debug('Accounts received', accounts);
                                
                                if (!accounts || accounts.length === 0) {
                                    throw new Error('No accounts available. Please unlock MetaMask and refresh the page.');
                                }
                                
                                App.account = accounts[0];
                                debug('Connected account', App.account);
                                
                                // Add listeners for account and network changes
                                window.ethereum.on('accountsChanged', function (accounts) {
                                    debug('Account change detected', accounts);
                                    if (!accounts || accounts.length === 0) {
                                        debug('No accounts available after change');
                                        App.account = null;
                                        window.location.reload();
                                    } else {
                                        App.account = accounts[0];
                                        debug('Account changed to', App.account);
                                    }
                                });

                                window.ethereum.on('chainChanged', (_chainId) => {
                                    debug('Network changed. Chain ID:', _chainId);
                                    window.location.reload();
                                });

                                window.ethereum.on('disconnect', (error) => {
                                    debug('MetaMask disconnected', error);
                                    App.account = null;
                                    window.location.reload();
                                });

                                // Verify chain connection
                                const chainId = await window.ethereum.request({ 
                                    method: 'eth_chainId' 
                                });
                                debug('Connected to chain', chainId);
                                
                                resolve();
                                return;
                            }
                        } catch (error) {
                            debug('Error during Web3 initialization attempt', error);
                        }
                    }
                    
                    debug('Waiting for Web3...', { attempt: retries + 1 });
                    await new Promise(r => setTimeout(r, retryInterval));
                    retries++;
                }
                
                throw new Error('Failed to initialize Web3 after multiple attempts. Please refresh the page.');
            } catch (error) {
                console.error('Error initializing Web3:', error);
                if (error.code === 4001) {
                    reject(new Error('Please allow MetaMask account access to use this application.'));
                } else {
                    reject(error);
                }
            }
        });
    },
    
    initContract: function() {
        debug('initContract() called');
        return new Promise((resolve, reject) => {
            $.getJSON('product.json', function(data) {
                try {
                    debug('Loading contract artifact');
                    var productArtifact = data;
                    App.contracts.product = TruffleContract(productArtifact);
                    App.contracts.product.setProvider(App.web3Provider);
                    debug('Contract artifact loaded and provider set');
                    resolve();
                } catch (error) {
                    console.error("Error setting up contract:", error);
                    reject(error);
                }
            }).fail(function(error) {
                console.error("Error loading product.json:", error);
                reject(error);
            });
        }).then(function() {
            debug('Binding events');
            return App.bindEvents();
        });
    },

    bindEvents: function() {
        debug('bindEvents() called');
        $(document).on('click', '.btn-register', App.verifyProduct);
        debug('Events bound successfully');
    },

    verifyProduct: async function(event) {
        event.preventDefault();
        debug('verifyProduct() called');

        // Clear previous results
        document.getElementById('logdata').innerHTML = "";
        document.getElementById('add').innerHTML = "";

        try {
            // Check if Web3 is properly initialized with detailed logging
            const web3State = {
                web3Present: !!App.web3,
                utilsPresent: !!App.web3?.utils,
                asciiToHexPresent: !!App.web3?.utils?.asciiToHex,
                padRightPresent: !!App.web3?.utils?.padRight,
                version: App.web3?.version
            };
            debug('Web3 state', web3State);

            if (!web3State.web3Present || !web3State.utilsPresent || !web3State.asciiToHexPresent || !web3State.padRightPresent) {
                throw new Error("Web3 is not properly initialized. Please refresh the page.");
            }

            debug('Checking MetaMask connection');
            // Check MetaMask connection
            if (!window.ethereum.isConnected()) {
                throw new Error("MetaMask is not connected. Please connect and try again.");
            }

            // Get current account
            const accounts = await window.ethereum.request({
                method: 'eth_requestAccounts'
            });

            if (!accounts || accounts.length === 0) {
                throw new Error("No Ethereum account available. Please unlock MetaMask and try again.");
            }

            const account = accounts[0];
            debug('Using account', account);
            
            // Get and validate input values
            const productSN = document.getElementById('productSN').value.trim();
            const consumerCode = document.getElementById('consumerCode').value.trim();

            if (!productSN || !consumerCode) {
                throw new Error("Please enter both Product Serial Number and Consumer Code");
            }

            debug('Verifying product', { productSN, consumerCode, account });

            // Get contract instance
            const instance = await App.contracts.product.deployed();
            if (!instance) {
                throw new Error("Contract instance not available. Please check your connection.");
            }

            try {
                // Convert inputs to bytes32
                debug('Converting inputs to bytes32');
                
                // Convert product SN to bytes32
                const productSNHex = App.web3.utils.asciiToHex(productSN);
                debug('Product SN hex', productSNHex);
                const productSNBytes = App.web3.utils.padRight(productSNHex, 64);
                debug('Product SN bytes32', productSNBytes);
                
                // Convert consumer code to bytes32
                const consumerCodeHex = App.web3.utils.asciiToHex(consumerCode);
                debug('Consumer code hex', consumerCodeHex);
                const consumerCodeBytes = App.web3.utils.padRight(consumerCodeHex, 64);
                debug('Consumer code bytes32', consumerCodeBytes);

                debug('Calling verifyProduct with', {
                    productSNBytes,
                    consumerCodeBytes,
                    account
                });

                // Get product verification
                const result = await instance.verifyProduct.call(
                    productSNBytes,
                    consumerCodeBytes,
                    { from: account }
                );

                debug('Verification result', result);

                // Display result
                let message = "";
                if (result === true) {
                    message = "✅ Genuine Product - Verified ownership for this consumer.";
                } else {
                    message = "❌ Not Genuine or Not Owned - This product either doesn't exist, hasn't been properly sold, or belongs to a different consumer.";
                }

                document.getElementById('logdata').innerHTML = `<tr><td>${message}</td></tr>`;
                document.getElementById('add').innerHTML = account;

                // Get additional product details for debugging
                try {
                    const productIndex = await instance.productMap.call(productSNBytes);
                    debug('Product Index', productIndex.toString());

                    if (productIndex.toNumber() > 0) {
                        const product = await instance.productItems.call(productIndex);
                        if (product) {
                            debug('Product Details', {
                                status: App.web3.utils.hexToAscii(product[5]).replace(/\u0000/g, ''),
                                name: App.web3.utils.hexToAscii(product[2]).replace(/\u0000/g, ''),
                                brand: App.web3.utils.hexToAscii(product[3]).replace(/\u0000/g, '')
                            });
                        }
                    }

                    const storedConsumer = await instance.productsSold.call(productSNBytes);
                    debug('Stored Consumer', App.web3.utils.hexToAscii(storedConsumer).replace(/\u0000/g, ''));
                } catch (error) {
                    console.error("Error fetching additional details:", error);
                }
            } catch (error) {
                console.error("Web3 utility error:", error);
                throw new Error("Failed to process input data: " + error.message);
            }

        } catch (error) {
            console.error("Verification error:", error);
            document.getElementById('logdata').innerHTML = `<tr><td>Error: ${error.message}</td></tr>`;
        }
    }
};

// Initialize the app
$(function() {
    debug('Document ready, initializing app');
    $(window).on('load', async function() {
        try {
            await App.init();
            debug('App initialized successfully');
        } catch (error) {
            console.error("Failed to initialize:", error);
            alert("Failed to initialize the application. Please make sure MetaMask is installed and connected, then refresh the page.");
        }
    });
});