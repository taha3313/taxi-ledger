require("@nomicfoundation/hardhat-toolbox");
require("dotenv").config();

module.exports = {
    solidity: {
    compilers: [
      { version: "0.8.19" },
      { version: "0.8.20" } 
    ]
  },
  networks: {
  localhost: {
    url: "http://127.0.0.1:8545"
  },
  },
};
