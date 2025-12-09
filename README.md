# TaxiLedger dApp

This project is a full-stack decentralized application (dApp) designed to create a transparent and immutable ledger for taxi trips. It leverages a Solidity smart contract and a React-based frontend to manage drivers, calculate fares, and record trip data on a local Hardhat blockchain network.

## Prerequisites

Before you begin, ensure you have the following installed:
*   [Node.js](https://nodejs.org/) (v18 or later is recommended)
*   npm (usually comes with Node.js)

## Getting Started

Follow these instructions to set up, run, and interact with the application on your local machine.

### 1. Clone the Repository

First, clone this repository to your local machine:

```sh
git clone https://github.com/taha3313/taxi-ledger.git
cd taxi-ledger
```

### 2. Install Dependencies

The project has two `package.json` files. You need to install dependencies for both the root (Hardhat project) and the frontend (React project).

```sh
# Install backend dependencies
npm install

# Navigate to the frontend directory and install its dependencies
cd taxi-frontend
npm install
```

### 3. Run the Local Blockchain

You will need three separate terminals for the following steps.

**In your first terminal**, navigate back to the project's root directory and start the local Hardhat blockchain node. This command also provides a list of 20 test accounts funded with fake ETH.

```sh
# From the project root directory
npx hardhat node
```
Leave this terminal running. It is your local blockchain.

### 4. Deploy the Smart Contract

**In your second terminal**, deploy the `TaxiLedger` smart contract to the local node.

```sh
# From the project root directory
npx hardhat run scripts/deploy.js --network localhost
```
After running, the script will output the deployed contract's address. Copy this address, as you will need it in the next step. It will look something like this:

`TaxiLedger deployed at: 0x5FbDB2315678afecb367f032d93F642f64180aa3`

### 5. Configure the Frontend

The frontend application needs to know where to find the smart contract on the blockchain.

1.  In the `taxi-frontend` directory, create a new file named `.env`.
2.  Add the following line to this new file, pasting the address you copied from the previous step:

    ```
    VITE_CONTRACT_ADDRESS=0x5FbDB2315678afecb367f032d93F642f64180aa3
    ```

### 6. Run the Frontend Application

**In your third terminal**, start the frontend development server.

```sh
# From the taxi-frontend directory
npm run dev
```
You can now open the application in your web browser at the local address provided (usually `http://localhost:5173`).

### 7. Using the Application

The application has three panels for the different user roles.

1.  **Register a Driver:**
    *   Go to the **Owner Panel**. The application automatically acts as the contract owner (the first account from the Hardhat node list).
    *   Copy a different account address from the list provided by `npx hardhat node` (e.g., the second one).
    *   Paste this address into the "Driver address" input field and click "Register Driver".

2.  **Record a Trip:**
    *   Go to the **Driver Panel**.
    *   **Crucially**, from the "Select Driver Account" dropdown, choose the address you just registered as a driver.
    *   Fill in the "Distance (meters)" and "Duration (seconds)" fields.
    *   Click "Record Trip" to submit the transaction to the blockchain. You should see a success message with the new Trip ID.

3.  **View a Trip:**
    *   Go to the **Passenger Panel**.
    *   Enter the Trip ID you received from the previous step (e.g., `1`).
    *   Click "View Trip" to retrieve and display the immutable details of that trip.