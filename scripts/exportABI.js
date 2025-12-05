const fs = require("fs");
const path = require("path");

const source = path.join(__dirname, "../artifacts/contracts/TaxiLedger.sol/TaxiLedger.json");
const dest = path.join(__dirname, "../abi/TaxiLedger.json");

fs.copyFileSync(source, dest);
console.log("ABI exported to abi/TaxiLedger.json");