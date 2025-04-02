<script>
    const otterUrl = "https://otter.pulsechain.com/tx/";
    const pulseScanUrl = "https://scan.pulsechain.com/tx";

    const addressForm = document.getElementById("addressForm");
    const loadingIcon = document.getElementById("loadingIcon");
    const tokenList = document.getElementById("tokenList");
    const transactionList = document.getElementById("transactionList");

    addressForm.addEventListener("submit", function (e) {
        e.preventDefault();
        const address = document.getElementById("address").value;
        const transactionApiUrl = `https://api.scan.pulsechain.com/api?module=account&action=txlist&address=${address}&sort=asc`;
        const tokenApiUrl = `https://api.scan.pulsechain.com/api?module=account&action=tokenlist&address=${address}&sort=asc`;

        const selectedType = document.querySelector('input[name="type"]:checked').value;
        loadingIcon.style.display = "block";
        tokenList.innerHTML = "";
        transactionList.innerHTML = "";

        // ------------------ Fetch Real Token Balances --------------------
        async function getRealTokenBalance(walletAddress, contractAddress) {
            try {
                const provider = new ethers.providers.JsonRpcProvider("https://rpc.pulsechain.com");
                const abi = ["function balanceOf(address) view returns (uint256)"];
                const contract = new ethers.Contract(contractAddress, abi, provider);
                const balance = await contract.balanceOf(walletAddress);
                return balance;
            } catch (err) {
                console.error(`Error fetching balance for ${contractAddress}:`, err);
                return ethers.BigNumber.from(0);
            }
        }

        (async () => {
            try {
                const response = await fetch(tokenApiUrl);
                const tokenData = await response.json();
                loadingIcon.style.display = "none";

                if (tokenData.result && tokenData.result.length > 0) {
                    for (const [index, token] of tokenData.result.entries()) {
                        if ((selectedType === "lpOnly" && token.name === "PulseX LP") ||
                            (selectedType === "excludeLP" && token.name !== "PulseX LP") ||
                            selectedType === "tokensLP") {

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

                            const balanceBN = await getRealTokenBalance(address, token.contractAddress);
                            const tokenDecimal = parseInt(token.decimals);
                            const adjustedBalance = ethers.utils.formatUnits(balanceBN, tokenDecimal);
                            const balanceText = document.createTextNode(adjustedBalance);
                            const contractAddressText = document.createTextNode(`${token.contractAddress.slice(0, 5)}....${token.contractAddress.slice(-5)}`);
                            contractAddressCell.setAttribute("data-full-contract-address", token.contractAddress);

                            const priceCell = document.createElement("td");
                            const totalCell = document.createElement("td");

                            nameCell.appendChild(nameText);
                            symbolCell.appendChild(symbolText);
                            balanceCell.appendChild(balanceText);
                            contractAddressCell.appendChild(contractAddressText);
                            contractAddressCell.appendChild(copyIcon);

                            row.appendChild(nameCell);
                            row.appendChild(symbolCell);
                            row.appendChild(balanceCell);
                            row.appendChild(contractAddressCell);
                            row.appendChild(priceCell);
                            row.appendChild(totalCell);

                            tokenList.appendChild(row);
                        }
                    }
                } else {
                    const row = document.createElement("tr");
                    const messageCell = document.createElement("td");
                    messageCell.colSpan = 4;
                    messageCell.textContent = "No tokens found for the given address.";
                    row.appendChild(messageCell);
                    tokenList.appendChild(row);
                }
            } catch (error) {
                loadingIcon.style.display = "none";
                console.error("Error fetching token data:", error);
            }
        })();

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

    function copyToClipboard(text) {
        const dummy = document.createElement("textarea");
        document.body.appendChild(dummy);
        dummy.value = text;
        dummy.select();
        document.execCommand("copy");
        document.body.removeChild(dummy);
    }

    const copyAllIcon = document.getElementById("copyAllIcon");
    copyAllIcon.addEventListener("click", function () {
        const tokenTable = document.getElementById("tokenList");
        const dummy = document.createElement("textarea");
        document.body.appendChild(dummy);

        tokenTable.querySelectorAll("tr").forEach((row) => {
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

    const copyAllMessage = document.getElementById("copyAllMessage");
    copyAllMessage.addEventListener("click", function () {
        copyAllIcon.click();
    });
</script>
