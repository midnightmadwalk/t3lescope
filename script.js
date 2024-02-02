// Constants for URLs
const otterUrl = "https://otter.pulsechain.com/tx/";
const pulseScanUrl = "https://scan.pulsechain.com/tx";

// DOM elements
const addressForm = document.getElementById("addressForm");
const loadingIcon = document.getElementById("loadingIcon");
const tokenList = document.getElementById("tokenList");
const transactionList = document.getElementById("transactionList");
const statusMessage = document.getElementById("statusMessage");
const cumulativeDollarAmountH3 = document.getElementById("cumulativeDollarAmount");
const nightModeToggle = document.getElementById("nightModeToggle");

// Event listener for night mode toggle
nightModeToggle.addEventListener("click", () => {
    document.body.classList.toggle("night-mode");

    // Save the user's preference to localStorage
    const isNightMode = document.body.classList.contains("night-mode");
    localStorage.setItem("nightMode", isNightMode);

    // You may need to adjust styles accordingly for a proper night mode appearance
});

// Check user's preference from localStorage
const isNightMode = localStorage.getItem("nightMode") === "true";

if (isNightMode) {
    document.body.classList.add("night-mode");
}

// Form submission event listener
addressForm.addEventListener("submit", async function (e) {
    e.preventDefault();

    // Get user-entered address
    const address = document.getElementById("address").value;
    // API URLs for transactions and tokens
    const transactionApiUrl = `https://api.scan.pulsechain.com/api?module=account&action=txlist&address=${address}&sort=asc`;
    const tokenApiUrl = `https://api.scan.pulsechain.com/api?module=account&action=tokenlist&address=${address}&sort=asc`;
    // Get the selected type
    const selectedType = document.querySelector('input[name="type"]:checked').value;

    // Show loading icon
    loadingIcon.style.display = "block";

    // Clear previous results
    tokenList.innerHTML = "";
    transactionList.innerHTML = "";

    // Set status message to blank
    statusMessage.textContent = "";

    // Initialize cumulative dollar amount
    let cumulativeDollarAmount = 0;
    cumulativeDollarAmountH3.textContent = "Wallet Token Value: $0.00";

    // Function to make API call to dexscreener
    async function getPriceFromDexscreener(contractAddress, rowIndex, relevantRowCount) {
        // Check if the name is "PulseX LP" and skip the API call
        const tokenNameCell = document.querySelector(`#${CSS.escape(contractAddress)} > td:first-child`);
        if (tokenNameCell && tokenNameCell.textContent.trim() === "PulseX LP") {
            console.log(`Skipping API call for PulseX LP at row ${rowIndex + 1}`);
            return;
        }

        statusMessage.textContent = `Processing row ${rowIndex + 1} out of ${relevantRowCount}`;

        const apiUrl = `https://api.dexscreener.com/latest/dex/tokens/${contractAddress}`;

        try {
            const response = await fetch(apiUrl);
            const data = await response.json();

            // Filter pairs with chainId "pulsechain" and quoteToken address "0xA1077a294dDE1B09bB078844df40758a5D0f9a27"
            const filteredPairs = data.pairs.filter(pair =>
                pair.chainId === "pulsechain" && pair.quoteToken.address === "0xA1077a294dDE1B09bB078844df40758a5D0f9a27"
            );

            // If there are multiple pairs, find the one with the highest liquidity
            const highestLiquidityPair = filteredPairs.reduce((maxPair, currentPair) =>
                currentPair.liquidity.usd > maxPair.liquidity.usd ? currentPair : maxPair
            );

            // Update the "Price" cell with the priceUsd from the highest liquidity pair
            const priceUsd = highestLiquidityPair.priceUsd;
            const priceCell = document.getElementById(contractAddress);
            const totalCell = document.getElementById(contractAddress + "x");
            const balanceCell = document.getElementById(contractAddress + "y");
            const checkboxCell = document.getElementById(contractAddress + "z");

            if (priceCell) {
                priceCell.textContent = priceUsd;
                totalCell.textContent = (priceUsd * balanceCell.textContent).toLocaleString('en-US', {
                    style: 'currency',
                    currency: 'USD'
                });

                // Create a checkbox and attach an event listener
                const checkbox = document.createElement("input");
                checkbox.type = "checkbox";
                checkbox.checked = true; // Default to checked
                checkbox.id = contractAddress + "z";
                checkbox.addEventListener("change", function (event) {
                    handleCheckboxChange(event, contractAddress);
                });

                // Add the checkbox to the "Check" cell
                if (checkboxCell) {
                    checkboxCell.appendChild(checkbox);
                }

                // Update cumulative dollar amount
                if (checkbox.checked) {
                    cumulativeDollarAmount += parseFloat(totalCell.textContent.replace(/[^0-9.-]+/g, ''));
                }

                cumulativeDollarAmountH3.textContent = `Wallet Token Value: ${cumulativeDollarAmount.toLocaleString('en-US', {
                    style: 'currency',
                    currency: 'USD'
                })}`;
            }

        } catch (error) {
            console.error("Error fetching price from dexscreener:", error);
        }
    }

    // Fetch token data
    fetch(tokenApiUrl)
        .then(response => response.json())
        .then(async tokenData => {
            // Hide loading icon
            loadingIcon.style.display = "none";

            if (tokenData.result && tokenData.result.length > 0) {
                const tokensToCallApi = [];
                let relevantRowCount = 0;
                let tempCounter = 0;

                for (let index = 0; index < tokenData.result.length; index++) {
                    tempCounter++;
                    const token = tokenData.result[index];
                    // Additional logic to filter results based on the selected type
                    if ((selectedType === "lpOnly" && token.name === "PulseX LP") ||
                        (selectedType === "excludeLP" && token.name !== "PulseX LP") ||
                        selectedType === "tokensLP") {
                        relevantRowCount++;
                        const row = document.createElement("tr");
                        const nameCell = document.createElement("td");
                        const symbolCell = document.createElement("td");
                        const balanceCell = document.createElement("td");
                        const contractAddressCell = document.createElement("td");
                        contractAddressCell.style.display = "flex";
                        const copyIcon = document.createElement("span");
                        copyIcon.innerHTML = "&#128203;";
                        copyIcon.style.cursor = "pointer";
                        copyIcon.style.color = "blue";
                        copyIcon.style.marginRight = "5px";
                        copyIcon.style.marginLeft = "10px";
                        copyIcon.classList.add("exclude-copy");
                        copyIcon.addEventListener("click", () => {
                            copyToClipboard(token.contractAddress);
                            copyIcon.style.color = "green";
                            setTimeout(() => {
                                copyIcon.style.color = "blue";
                            }, 1000);
                        });
                        const nameText = document.createTextNode(token.name);
                        const symbolText = document.createTextNode(token.symbol);
                        const checkText = document.createTextNode("");
                        const balanceWei = parseFloat(token.balance);
                        const tokenDecimal = parseInt(token.decimals);
                        const adjustedBalance = adjustBalance(balanceWei, tokenDecimal);
                        const balanceText = document.createTextNode(adjustedBalance);
                        const contractAddressText = document.createTextNode(`${token.contractAddress.slice(0, 5)}....${token.contractAddress.slice(-5)}`);
                        contractAddressCell.setAttribute("data-full-contract-address", token.contractAddress);
                        // Create cells for the new "Price" and "Total" columns
                        const priceCell = document.createElement("td");
                        const totalCell = document.createElement("td");
                        const checkCell = document.createElement("td");
                        priceCell.id = token.contractAddress;
                        totalCell.id = token.contractAddress + "x";
                        balanceCell.id = token.contractAddress + "y";
                        checkCell.id = token.contractAddress + "z";

                        nameCell.appendChild(nameText);
                        symbolCell.appendChild(symbolText);
                        balanceCell.appendChild(balanceText);
                        contractAddressCell.appendChild(contractAddressText);
                        contractAddressCell.appendChild(copyIcon);
                        checkCell.appendChild(checkText);

                        row.appendChild(nameCell);
                        row.appendChild(symbolCell);
                        row.appendChild(balanceCell);
                        row.appendChild(contractAddressCell);
                        row.appendChild(checkCell);
                        row.appendChild(priceCell);
                        row.appendChild(totalCell);

                        tokenList.appendChild(row);

                        // Check if the token name is eligible for API call
                        const eligibleForApiCall = !["Null", "null", "NULL", "PulseX LP"].includes(token.name);
                        if (eligibleForApiCall) {
                            // Add token to the array for later API call
                            tokensToCallApi.push(token.contractAddress);
                        }

                        // Check if it's the last row
                        if (selectedType === "lpOnly") {
                            statusMessage.textContent = "Currently unable to obtain accurate pricing data for LPs. The below is for your reference of LP held in the submitted wallet.";
                        }
                        if (tempCounter === tokenData.result.length - 1) {
                            let rowsWithPrice = 0;

                            // Make API calls for all tokens
                            for (const [apiIndex, contractAddress] of tokensToCallApi.entries()) {
                                await getPriceFromDexscreener(contractAddress, apiIndex, relevantRowCount);
                                // Wait for 1 second before making the next API call
                                await new Promise(resolve => setTimeout(resolve, 5));

                                // Check if the "Price" cell has a value
                                const priceCell = document.getElementById(contractAddress);
                                if (priceCell && priceCell.textContent.trim() !== "") {
                                    rowsWithPrice++;
                                }

                                // Check if it's the last iteration of the API calls
                                if (apiIndex === tokensToCallApi.length - 1) {
                                    if (selectedType === "tokensLP") {
                                        statusMessage.textContent = `LP dollar value is not currently able to be calculated and was not included. Found pricing for ${rowsWithPrice} tokens.`;
                                    } else {
                                        statusMessage.textContent = `Pricing Data Completed. Found pricing for ${rowsWithPrice} tokens.`; // Set status message
                                    }
                                }
                            }
                        }
                    }
                }

                // Handle checkbox changes
                tokenList.addEventListener('change', function (event) {
                    const checkbox = event.target;
                    if (checkbox.type === 'checkbox' && checkbox.id.endsWith('z')) {
                        const row = checkbox.closest('tr');
                        const totalCell = row.querySelector('td[id$="x"]');
                        
                        if (checkbox.checked) {
                            cumulativeDollarAmount += parseFloat(totalCell.textContent.replace(/[^0-9.-]+/g, ''));
                        } else {
                            cumulativeDollarAmount -= parseFloat(totalCell.textContent.replace(/[^0-9.-]+/g, ''));
                        }

                        cumulativeDollarAmountH3.textContent = `Wallet Token Value: ${cumulativeDollarAmount.toLocaleString('en-US', {
                            style: 'currency',
                            currency: 'USD'
                        })}`;
                    }
                });

            } else {
                const row = document.createElement("tr");
                const messageCell = document.createElement("td");
                messageCell.colSpan = 4;
                messageCell.textContent = "No tokens found for the given address.";
                row.appendChild(messageCell);
                tokenList.appendChild(row);
                statusMessage.textContent = "No tokens found for the given address.";
            }
        })
        .catch(error => {
            // Handle errors here
            loadingIcon.style.display = "none";
            console.error("Error fetching token data:", error);
        });

    // Function to adjust balance based on decimals
    function adjustBalance(balance, decimals) {
        if (decimals === 18 || decimals === 0 || decimals === "") {
            return (balance / 1e18).toFixed(8);
        } else {
            const power = Math.pow(10, decimals);
            return (balance / power).toString();
        }
    }

    function copyToClipboard(text) {
        const dummy = document.createElement("textarea");
        document.body.appendChild(dummy);
        dummy.value = text;
        dummy.select();
        document.execCommand("copy");
        document.body.removeChild(dummy);
    }

    fetch(transactionApiUrl)
        .then(response => response.json())
        .then(data => {
            if (data.result && data.result.length > 0) {
                data.result.forEach((transaction, index) => {
                    const row = document.createElement("tr");
                    const transactionText = document.createTextNode(`${index + 1}`);
                    const hashText = document.createTextNode(transaction.hash);
                    const otterButton = document.createElement("button");
                    otterButton.textContent = "Otter";
                    otterButton.addEventListener("click", function () {
                        window.open(`${otterUrl}${transaction.hash}`, "_blank");
                    });
                    const pulseScanButton = document.createElement("button");
                    pulseScanButton.textContent = "PulseScan";
                    pulseScanButton.addEventListener("click", function () {
                        window.open(`${pulseScanUrl}/${transaction.hash}`, "_blank");
                    });

                    const transactionCell = document.createElement("td");
                    transactionCell.appendChild(transactionText);
                    const hashCell = document.createElement("td");
                    hashCell.appendChild(hashText);
                    const otterCell = document.createElement("td");
                    otterCell.appendChild(otterButton);
                    const pulseScanCell = document.createElement("td");
                    pulseScanCell.appendChild(pulseScanButton);

                    row.appendChild(transactionCell);
                    row.appendChild(hashCell);
                    row.appendChild(otterCell);
                    row.appendChild(pulseScanCell);

                    transactionList.appendChild(row);
                });
            } else {
                const row = document.createElement("tr");
                const messageCell = document.createElement("td");
                messageCell.colSpan = 4;
                messageCell.textContent = "No transactions found for the given address.";
                row.appendChild(messageCell);
                transactionList.appendChild(row);
            }
        })
        .catch(error => {
            loadingIcon.style.display = "none";
            console.error("Error fetching transaction data:", error);
        });
});

// Copy all data to clipboard event listener
const copyAllIcon = document.getElementById("copyAllIcon");
copyAllIcon.addEventListener("click", function () {
    const tokenTable = document.getElementById("tokenList");
    const dummy = document.createElement("textarea");
    document.body.appendChild(dummy);

    tokenTable.querySelectorAll("tr").forEach((row, index) => {
        const rowData = Array.from(row.getElementsByTagName("td")).map(cell => {
            if (cell.classList.contains("exclude-copy")) {
                return cell.textContent.trim();
            } else if (cell.getAttribute("data-full-contract-address")) {
                return cell.getAttribute("data-full-contract-address");
            } else {
                return cell.textContent.trim();
            }
        }).join("\t");

        dummy.value += `${rowData}\n`;
    });

    dummy.select();
    document.execCommand("copy");
    document.body.removeChild(dummy);

    copyAllIcon.style.color = "green";
    setTimeout(() => {
        copyAllIcon.style.color = "blue";
    }, 1000);
});

// Copy all data message click event listener
const copyAllMessage = document.getElementById("copyAllMessage");
copyAllMessage.addEventListener("click", function () {
    copyAllIcon.click();
});

function handleCheckboxChange(event, contractAddress) {
    const row = event.target.closest('tr');

    if (event.target.checked) {
        // If checkbox is checked, remove the strike-through class
        row.classList.remove('strike-through');
    } else {
        // If checkbox is unchecked, add the strike-through class
        row.classList.add('strike-through');
    }
}
