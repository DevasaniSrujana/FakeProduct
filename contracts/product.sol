pragma solidity ^0.8.12;

contract product {

    uint256 sellerCount;
    uint256 productCount;
    uint256 manufacturerCount;
    uint256 reportCount;

    struct seller{
        uint256 sellerId;
        bytes32 sellerName;
        bytes32 sellerBrand;
        bytes32 sellerCode;
        uint256 sellerNum;
        bytes32 sellerManager;
        bytes32 sellerAddress;
    }
    mapping(uint=>seller) public sellers;

    struct productItem{
        uint256 productId;
        bytes32 productSN;
        bytes32 productName;
        bytes32 productBrand;
        uint256 productPrice;
        bytes32 productStatus;
    }

    mapping(uint256=>productItem) public productItems;
    mapping(bytes32=>uint256) public productMap;
    mapping(bytes32=>bytes32) public productsManufactured;
    mapping(bytes32=>bytes32) public productsForSale;
    mapping(bytes32=>bytes32) public productsSold;
    mapping(bytes32=>bytes32[]) public productsWithSeller;
    mapping(bytes32=>bytes32[]) public productsWithConsumer;
    mapping(bytes32=>bytes32[]) public sellersWithManufacturer;

    struct manufacturer {
        uint256 manufacturerId;
        bytes32 manufacturerName;
        bytes32 manufacturerBrand;
        bytes32 manufacturerCode;
        uint256 manufacturerPhone;
        bytes32 manufacturerManager;
        bytes32 manufacturerAddress;
    }

    mapping(uint256 => manufacturer) public manufacturers;
    mapping(bytes32 => bool) public manufacturerExists;

    struct FakeProductReport {
        uint256 reportId;
        bytes32 productSN;
        bytes32 reporterCode;
        bytes32 description;
        bytes32 status; // "Pending", "Investigating", "Resolved"
        uint256 timestamp;
    }

    mapping(uint256 => FakeProductReport) public fakeProductReports;
    mapping(bytes32 => uint256[]) public productReports; // productSN => reportIds
    mapping(bytes32 => uint256[]) public manufacturerReports; // manufacturerCode => reportIds

    //SELLER SECTION

    function addSeller(bytes32 _manufacturerId, bytes32 _sellerName, bytes32 _sellerBrand, bytes32 _sellerCode,
    uint256 _sellerNum, bytes32 _sellerManager, bytes32 _sellerAddress) public{
        sellers[sellerCount] = seller(sellerCount, _sellerName, _sellerBrand, _sellerCode,
        _sellerNum, _sellerManager, _sellerAddress);
        sellerCount++;

        sellersWithManufacturer[_manufacturerId].push(_sellerCode);
    }


    function viewSellers () public view returns(uint256[] memory, bytes32[] memory, bytes32[] memory, bytes32[] memory, uint256[] memory, bytes32[] memory, bytes32[] memory) {
        uint256[] memory ids = new uint256[](sellerCount);
        bytes32[] memory snames = new bytes32[](sellerCount);
        bytes32[] memory sbrands = new bytes32[](sellerCount);
        bytes32[] memory scodes = new bytes32[](sellerCount);
        uint256[] memory snums = new uint256[](sellerCount);
        bytes32[] memory smanagers = new bytes32[](sellerCount);
        bytes32[] memory saddress = new bytes32[](sellerCount);
        
        for(uint i=0; i<sellerCount; i++){
            ids[i] = sellers[i].sellerId;
            snames[i] = sellers[i].sellerName;
            sbrands[i] = sellers[i].sellerBrand;
            scodes[i] = sellers[i].sellerCode;
            snums[i] = sellers[i].sellerNum;
            smanagers[i] = sellers[i].sellerManager;
            saddress[i] = sellers[i].sellerAddress;
        }
        return(ids, snames, sbrands, scodes, snums, smanagers, saddress);
    }

    //PRODUCT SECTION

    function addProduct(bytes32 _manufactuerID, bytes32 _productName, bytes32 _productSN, bytes32 _productBrand,
    uint256 _productPrice) public{
        productItems[productCount] = productItem(productCount, _productSN, _productName, _productBrand,
        _productPrice, "Available");
        productMap[_productSN] = productCount;
        productCount++;
        productsManufactured[_productSN] = _manufactuerID;
    }


    function viewProductItems () public view returns(uint256[] memory, bytes32[] memory, bytes32[] memory, bytes32[] memory, uint256[] memory, bytes32[] memory) {
        uint256[] memory pids = new uint256[](productCount);
        bytes32[] memory pSNs = new bytes32[](productCount);
        bytes32[] memory pnames = new bytes32[](productCount);
        bytes32[] memory pbrands = new bytes32[](productCount);
        uint256[] memory pprices = new uint256[](productCount);
        bytes32[] memory pstatus = new bytes32[](productCount);
        
        for(uint i=0; i<productCount; i++){
            pids[i] = productItems[i].productId;
            pSNs[i] = productItems[i].productSN;
            pnames[i] = productItems[i].productName;
            pbrands[i] = productItems[i].productBrand;
            pprices[i] = productItems[i].productPrice;
            pstatus[i] = productItems[i].productStatus;
        }
        return(pids, pSNs, pnames, pbrands, pprices, pstatus);
    }

    //SELL Product

    function manufacturerSellProduct(bytes32 _productSN, bytes32 _sellerCode) public{
        productsWithSeller[_sellerCode].push(_productSN);
        productsForSale[_productSN] = _sellerCode;

    }

    function sellerSellProduct(bytes32 _productSN, bytes32 _consumerCode) public {   
        // Check if the product exists and get its index
        uint256 productIndex = productMap[_productSN];
        require(productIndex < productCount, "Product does not exist");
        
        // Get the current product
        productItem storage currentProduct = productItems[productIndex];
        
        // Verify product serial number matches
        require(currentProduct.productSN == _productSN, "Product SN mismatch");
        
        // Convert status to bytes32 for comparison
        bytes32 availableStatus = "Available";
        bytes32 notAvailableStatus = "NA";
        
        // Check if product is available
        require(currentProduct.productStatus == availableStatus, "Product not available for sale");
        
        // Update product status to NA
        currentProduct.productStatus = notAvailableStatus;
        
        // Record the sale
        productsWithConsumer[_consumerCode].push(_productSN);
        productsSold[_productSN] = _consumerCode;
    }


    function queryProductsList(bytes32 _sellerCode) public view returns(uint256[] memory, bytes32[] memory, bytes32[] memory, bytes32[] memory, uint256[] memory, bytes32[] memory){
        bytes32[] memory productSNs = productsWithSeller[_sellerCode];
        uint256 k=0;

        uint256[] memory pids = new uint256[](productCount);
        bytes32[] memory pSNs = new bytes32[](productCount);
        bytes32[] memory pnames = new bytes32[](productCount);
        bytes32[] memory pbrands = new bytes32[](productCount);
        uint256[] memory pprices = new uint256[](productCount);
        bytes32[] memory pstatus = new bytes32[](productCount);

        
        for(uint i=0; i<productCount; i++){
            for(uint j=0; j<productSNs.length; j++){
                if(productItems[i].productSN==productSNs[j]){
                    pids[k] = productItems[i].productId;
                    pSNs[k] = productItems[i].productSN;
                    pnames[k] = productItems[i].productName;
                    pbrands[k] = productItems[i].productBrand;
                    pprices[k] = productItems[i].productPrice;
                    pstatus[k] = productItems[i].productStatus;
                    k++;
                }
            }
        }
        return(pids, pSNs, pnames, pbrands, pprices, pstatus);
    }

    function querySellersList (bytes32 _manufacturerCode) public view returns(uint256[] memory, bytes32[] memory, bytes32[] memory, bytes32[] memory, uint256[] memory, bytes32[] memory, bytes32[] memory) {
        bytes32[] memory sellerCodes = sellersWithManufacturer[_manufacturerCode];
        uint256 k=0;
        uint256[] memory ids = new uint256[](sellerCount);
        bytes32[] memory snames = new bytes32[](sellerCount);
        bytes32[] memory sbrands = new bytes32[](sellerCount);
        bytes32[] memory scodes = new bytes32[](sellerCount);
        uint256[] memory snums = new uint256[](sellerCount);
        bytes32[] memory smanagers = new bytes32[](sellerCount);
        bytes32[] memory saddress = new bytes32[](sellerCount);
        
        for(uint i=0; i<sellerCount; i++){
            for(uint j=0; j<sellerCodes.length; j++){
                if(sellers[i].sellerCode==sellerCodes[j]){
                    ids[k] = sellers[i].sellerId;
                    snames[k] = sellers[i].sellerName;
                    sbrands[k] = sellers[i].sellerBrand;
                    scodes[k] = sellers[i].sellerCode;
                    snums[k] = sellers[i].sellerNum;
                    smanagers[k] = sellers[i].sellerManager;
                    saddress[k] = sellers[i].sellerAddress;
                    k++;
                    break;
               }
            }
        }

        return(ids, snames, sbrands, scodes, snums, smanagers, saddress);
    }

    function getPurchaseHistory(bytes32 _consumerCode) public view returns (bytes32[] memory, bytes32[] memory, bytes32[] memory){
        bytes32[] memory productSNs = productsWithConsumer[_consumerCode];
        bytes32[] memory sellerCodes = new bytes32[](productSNs.length);
        bytes32[] memory manufacturerCodes = new bytes32[](productSNs.length);
        for(uint i=0; i<productSNs.length; i++){
            sellerCodes[i] = productsForSale[productSNs[i]];
            manufacturerCodes[i] = productsManufactured[productSNs[i]];
        }
        return (productSNs, sellerCodes, manufacturerCodes);
    }

    //Verify

    function verifyProduct(bytes32 _productSN, bytes32 _consumerCode) public view returns(bool) {
        // First check if product exists
        uint256 productIndex = productMap[_productSN];
        if(productIndex >= productCount) {
            return false; // Product doesn't exist
        }

        // Get the product
        productItem storage currentProduct = productItems[productIndex];

        // Check if the stored consumer matches
        bytes32 storedConsumer = productsSold[_productSN];
        
        // Check if product status is "NA" (Not Available)
        bytes32 status = currentProduct.productStatus;
        
        // All conditions must be true:
        // 1. Product exists and SN matches
        // 2. Product has been sold (has a consumer)
        // 3. The consumer code matches
        // 4. Status is "NA"
        return (currentProduct.productSN == _productSN && 
                storedConsumer != 0 &&
                storedConsumer == _consumerCode &&
                keccak256(abi.encodePacked(status)) == keccak256(abi.encodePacked("NA")));
    }

    function registerManufacturer(
        bytes32 _manufacturerName,
        bytes32 _manufacturerBrand,
        bytes32 _manufacturerCode,
        uint256 _manufacturerPhone,
        bytes32 _manufacturerManager,
        bytes32 _manufacturerAddress
    ) public {
        require(!manufacturerExists[_manufacturerCode], "Manufacturer code already exists");
        
        manufacturers[manufacturerCount] = manufacturer(
            manufacturerCount,
            _manufacturerName,
            _manufacturerBrand,
            _manufacturerCode,
            _manufacturerPhone,
            _manufacturerManager,
            _manufacturerAddress
        );
        
        manufacturerExists[_manufacturerCode] = true;
        manufacturerCount++;
    }

    function getManufacturerDetails(bytes32 _manufacturerCode) public view returns (
        uint256,
        bytes32,
        bytes32,
        bytes32,
        uint256,
        bytes32,
        bytes32
    ) {
        for (uint256 i = 0; i < manufacturerCount; i++) {
            if (manufacturers[i].manufacturerCode == _manufacturerCode) {
                return (
                    manufacturers[i].manufacturerId,
                    manufacturers[i].manufacturerName,
                    manufacturers[i].manufacturerBrand,
                    manufacturers[i].manufacturerCode,
                    manufacturers[i].manufacturerPhone,
                    manufacturers[i].manufacturerManager,
                    manufacturers[i].manufacturerAddress
                );
            }
        }
        revert("Manufacturer not found");
    }

    function reportFakeProduct(
        bytes32 _productSN,
        bytes32 _reporterCode,
        bytes32 _description
    ) public {
        require(_productSN != "", "Product serial number cannot be empty");
        require(_reporterCode != "", "Reporter code cannot be empty");
        
        bytes32 manufacturerCode = productsManufactured[_productSN];
        require(manufacturerCode != "", "Product not found or manufacturer not registered");

        fakeProductReports[reportCount] = FakeProductReport(
            reportCount,
            _productSN,
            _reporterCode,
            _description,
            "Pending",
            block.timestamp
        );

        productReports[_productSN].push(reportCount);
        manufacturerReports[manufacturerCode].push(reportCount);
        reportCount++;
    }

    function updateReportStatus(
        uint256 _reportId,
        bytes32 _newStatus,
        bytes32 _manufacturerCode
    ) public {
        require(_reportId < reportCount, "Report does not exist");
        
        bytes32 productSN = fakeProductReports[_reportId].productSN;
        require(productsManufactured[productSN] == _manufacturerCode, "Only the product manufacturer can update report status");
        
        fakeProductReports[_reportId].status = _newStatus;
    }

    function getProductReports(bytes32 _productSN) public view returns (
        uint256[] memory,
        bytes32[] memory,
        bytes32[] memory,
        bytes32[] memory,
        uint256[] memory
    ) {
        uint256[] memory reportIds = productReports[_productSN];
        uint256 length = reportIds.length;
        
        bytes32[] memory reporters = new bytes32[](length);
        bytes32[] memory descriptions = new bytes32[](length);
        bytes32[] memory statuses = new bytes32[](length);
        uint256[] memory timestamps = new uint256[](length);
        
        for(uint i = 0; i < length; i++) {
            FakeProductReport memory report = fakeProductReports[reportIds[i]];
            reporters[i] = report.reporterCode;
            descriptions[i] = report.description;
            statuses[i] = report.status;
            timestamps[i] = report.timestamp;
        }
        
        return (reportIds, reporters, descriptions, statuses, timestamps);
    }

    function getManufacturerReports(bytes32 _manufacturerCode) public view returns (
        uint256[] memory,
        bytes32[] memory,
        bytes32[] memory,
        bytes32[] memory,
        uint256[] memory
    ) {
        uint256[] memory reportIds = manufacturerReports[_manufacturerCode];
        uint256 length = reportIds.length;
        
        bytes32[] memory productSNs = new bytes32[](length);
        bytes32[] memory descriptions = new bytes32[](length);
        bytes32[] memory statuses = new bytes32[](length);
        uint256[] memory timestamps = new uint256[](length);
        
        for(uint i = 0; i < length; i++) {
            FakeProductReport memory report = fakeProductReports[reportIds[i]];
            productSNs[i] = report.productSN;
            descriptions[i] = report.description;
            statuses[i] = report.status;
            timestamps[i] = report.timestamp;
        }
        
        return (reportIds, productSNs, descriptions, statuses, timestamps);
    }
}