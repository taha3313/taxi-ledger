# Project Overview: TaxiLedger dApp

This document provides an overview of the TaxiLedger decentralized application, including its purpose, architecture, and the full source code for its core components.

## 1. Project Idea

The TaxiLedger project is a full-stack decentralized application (dApp) designed to create a transparent and immutable ledger for taxi trips. It leverages a smart contract on an Ethereum-compatible blockchain to record trip data, manage drivers, and calculate fares in a decentralized manner.

The system has three main user roles:

*   **Owner:** A privileged role that has administrative control over the smart contract. The owner is responsible for registering and removing taxi drivers and for setting the fare parameters.
*   **Driver:** A registered user who can record taxi trips on the blockchain. Each trip includes details like distance, duration, and a calculated fare.
*   **Passenger/Auditor:** Any user who can query the blockchain to retrieve and verify the details of a specific trip using its unique ID.

This approach ensures that all trip records are tamper-proof and publicly verifiable, bringing trust and transparency to the taxi industry.

## 2. Implementation

The project is split into two main parts: a Solidity-based backend (the smart contract) and a React-based frontend for user interaction.

### Backend

*   **Smart Contract (`TaxiLedger.sol`):** The core logic is encapsulated in a Solidity smart contract. It uses the OpenZeppelin `Ownable` contract to manage administrative privileges.
    *   **State Variables:** It stores fare parameters (base fare, per km, per minute), a mapping of registered drivers, and a mapping to store all trip data.
    *   **Functions:**
        *   `registerDriver`/`removeDriver`: Owner-only functions to manage the list of approved drivers.
        *   `updateFareRates`: An owner-only function to adjust the fare calculation parameters.
        *   `recordTrip`: A driver-only function that calculates the fare for a trip (based on distance and duration) and records it on the blockchain.
        *   `getTrip`: A public function that allows anyone to retrieve the details of a recorded trip.
*   **Development Environment:** The project uses Hardhat as the development environment for compiling, testing, and deploying the smart contract to a local blockchain node.

### Frontend

*   **Framework:** A user-friendly web interface built with React and Vite.
*   **Blockchain Interaction:** It uses the `ethers.js` library to connect to the local Hardhat blockchain node. It interacts with the deployed `TaxiLedger` smart contract by using its address and ABI (Application Binary Interface).
*   **User Interface (`App.jsx`):**
    *   The UI is divided into three tabs, one for each user role (Owner, Driver, Passenger).
    *   **Owner Panel:** Allows the contract owner to enter a driver's Ethereum address and register them.
    *   **Driver Panel:** Provides a form for a registered driver to input trip details (distance, duration) and record the trip.
    *   **Passenger Panel:** Allows any user to enter a Trip ID and view the complete, immutable details of that trip, including a QR code representation of the data.

---

## 3. Source Code

### `contracts/TaxiLedger.sol`

```solidity
// SPDX-License-Identifier: MIT
pragma solidity ^0.8.19;

import "@openzeppelin/contracts/access/Ownable.sol";

contract TaxiLedger is Ownable {

    uint256 private _tripIds;

    // Fare parameters (in millimes: 1 TND = 1000 millimes)
    uint256 public baseFare;
    uint256 public perKmFare;
    uint256 public perMinuteFare;

    mapping(address => bool) public registeredDrivers;

    struct Trip {
        uint256 id;
        address driver;
        uint256 distanceMeters;
        uint256 durationSeconds;
        uint256 fareMillimes;
        uint256 timestamp;
        bytes32 dataHash;
    }

    mapping(uint256 => Trip) public trips;

    event DriverRegistered(address driver);
    event DriverRemoved(address driver);
    event FareUpdated(uint256 baseFare, uint256 perKmFare, uint256 perMinuteFare);
    event TripRecorded(uint256 tripId, address driver, uint256 fare);

    constructor(
        uint256 _base,
        uint256 _perKm,
        uint256 _perMin,
        address initialOwner
    ) Ownable(initialOwner) {
        baseFare = _base;
        perKmFare = _perKm;
        perMinuteFare = _perMin;
    }

    modifier onlyDriver() {
        require(registeredDrivers[msg.sender], "Not a registered driver");
        _;
    }

    function registerDriver(address driver) external onlyOwner {
        registeredDrivers[driver] = true;
        emit DriverRegistered(driver);
    }

    function removeDriver(address driver) external onlyOwner {
        registeredDrivers[driver] = false;
        emit DriverRemoved(driver);
    }

    function updateFareRates(
        uint256 _base,
        uint256 _perKm,
        uint256 _perMin
    ) external onlyOwner {
        baseFare = _base;
        perKmFare = _perKm;
        perMinuteFare = _perMin;
        emit FareUpdated(_base, _perKm, _perMin);
    }

    function calculateFare(
        uint256 distanceMeters,
        uint256 durationSeconds
    ) public view returns (uint256) {
        uint256 km = distanceMeters / 1000;
        uint256 tripMinutes = durationSeconds / 60;

        return baseFare + (km * perKmFare) + (tripMinutes * perMinuteFare);
    }
    
    function recordTrip(
        uint256 distanceMeters,
        uint256 durationSeconds,
        bytes32 dataHash
    ) external onlyDriver {
        uint256 fare = calculateFare(distanceMeters, durationSeconds);

        _tripIds++;
        uint256 newTripId = _tripIds;

        trips[newTripId] = Trip(
            newTripId,
            msg.sender,
            distanceMeters,
            durationSeconds,
            fare,
            block.timestamp,
            dataHash
        );

        emit TripRecorded(newTripId, msg.sender, fare);
    }

    function getTrip(uint256 tripId) external view returns (Trip memory) {
        return trips[tripId];
    }
}
```

### `taxi-frontend/src/App.jsx`

```jsx
import { useState, useEffect } from "react";
import { ethers } from "ethers";
import * as QRCode from "qrcode.react";
import taxiAbi from "./abi/TaxiLedger.json";

const CONTRACT_ADDRESS = import.meta.env.VITE_CONTRACT_ADDRESS;

export default function App() {
  const [provider, setProvider] = useState(null);
  const [signer, setSigner] = useState(null);
  const [contract, setContract] = useState(null);

  const [currentTab, setCurrentTab] = useState("owner"); // owner | driver | passenger

  // Owner panel
  const [driverAddress, setDriverAddress] = useState("");
  const [ownerStatus, setOwnerStatus] = useState("");

  // Driver panel
  const [distance, setDistance] = useState("");
  const [duration, setDuration] = useState("");
  const [dataHash, setDataHash] = useState("");
  const [driverStatus, setDriverStatus] = useState("");

  // Passenger panel
  const [viewTripId, setViewTripId] = useState("");
  const [tripData, setTripData] = useState(null);

  // Initialize connection to Hardhat Local Node (MetaMask not required)
  useEffect(() => {
    const init = async () => {
      try {
        const prov = new ethers.providers.JsonRpcProvider("http://127.0.0.1:8545");
        const sign = prov.getSigner(0); // default Hardhat signer
        const cont = new ethers.Contract(CONTRACT_ADDRESS, taxiAbi, sign);

        setProvider(prov);
        setSigner(sign);
        setContract(cont);
      } catch (err) {
        console.error(err);
      }
    };
    init();
  }, []);

  // OWNER: Register a driver
  async function registerDriver() {
    try {
      const tx = await contract.registerDriver(driverAddress);
      await tx.wait();
      setOwnerStatus("Driver registered successfully!");
    } catch (err) {
      console.error(err);
      setOwnerStatus("Error: " + err.message);
    }
  }

  // DRIVER: Record trip
  async function recordTrip() {
    try {
      const hashBytes = ethers.utils.formatBytes32String(dataHash);
      const tx = await contract.recordTrip(
        parseInt(distance),
        parseInt(duration),
        hashBytes
      );
      const receipt = await tx.wait();
      const tripId = receipt.events[0].args.tripId.toString();

      setDriverStatus("Trip recorded! Trip ID = " + tripId);
    } catch (err) {
      console.error(err);
      setDriverStatus("Error: " + err.message);
    }
  }

  // PASSENGER: View trip details
  async function fetchTrip() {
    try {
      const trip = await contract.getTrip(parseInt(viewTripId));
      setTripData({
        id: trip.id.toString(),
        driver: trip.driver,
        distance: trip.distanceMeters.toString(),
        duration: trip.durationSeconds.toString(),
        fare: trip.fareMillimes.toString(),
        timestamp: new Date(trip.timestamp * 1000).toLocaleString(),
        dataHash: trip.dataHash
      });
    } catch (err) {
      console.error(err);
      setTripData(null);
    }
  }

  return (
    <div className="p-8 font-sans">
      <h1 className="text-3xl font-bold mb-6">TaxiLedger DApp</h1>

      {/* Navigation */}
      <div className="mb-4">
        <button
          onClick={() => setCurrentTab("owner")}
          className="mr-2 px-4 py-2 border rounded-md bg-blue-500 text-white hover:bg-blue-600"
        >
          Owner Panel
        </button>
        <button
          onClick={() => setCurrentTab("driver")}
          className="mr-2 px-4 py-2 border rounded-md bg-green-500 text-white hover:bg-green-600"
        >
          Driver Panel
        </button>
        <button
          onClick={() => setCurrentTab("passenger")}
          className="px-4 py-2 border rounded-md bg-purple-500 text-white hover:bg-purple-600"
        >
          Passenger Panel
        </button>
      </div>

      {/* ========================= OWNER PANEL ========================= */}
      {currentTab === "owner" && (
        <div className="p-6 border rounded-lg shadow-md bg-gray-50">
          <h2 className="text-2xl font-semibold mb-4">👑 Owner Panel</h2>
          <input
            type="text"
            placeholder="Driver address"
            value={driverAddress}
            onChange={(e) => setDriverAddress(e.target.value)}
            className="w-full p-2 border border-gray-300 rounded-md mb-4 focus:outline-none focus:ring-2 focus:ring-blue-500"
          />
          <button onClick={registerDriver} className="px-6 py-2 bg-blue-500 text-white rounded-md hover:bg-blue-600">Register Driver</button>
          <p className="mt-4 text-gray-700">{ownerStatus}</p>
        </div>
      )}

      {/* ========================= DRIVER PANEL ========================= */}
      {currentTab === "driver" && (
        <div className="p-6 border rounded-lg shadow-md bg-gray-50">
          <h2 className="text-2xl font-semibold mb-4">🚖 Driver Panel</h2>
          <input
            type="number"
            placeholder="Distance (meters)"
            value={distance}
            onChange={(e) => setDistance(e.target.value)}
            className="w-full p-2 border border-gray-300 rounded-md mb-2 focus:outline-none focus:ring-2 focus:ring-green-500"
          />
          <input
            type="number"
            placeholder="Duration (seconds)"
            value={duration}
            onChange={(e) => setDuration(e.target.value)}
            className="w-full p-2 border border-gray-300 rounded-md mb-2 focus:outline-none focus:ring-2 focus:ring-green-500"
          />
          <input
            type="text"
            placeholder="Data hash (optional text)"
            value={dataHash}
            onChange={(e) => setDataHash(e.target.value)}
            className="w-full p-2 border border-gray-300 rounded-md mb-4 focus:outline-none focus:ring-2 focus:ring-green-500"
          />
          <button onClick={recordTrip} className="px-6 py-2 bg-green-500 text-white rounded-md hover:bg-green-600">Record Trip</button>
          <p className="mt-4 text-gray-700">{driverStatus}</p>
        </div>
      )}

      {/* ====================== PASSENGER PANEL ====================== */}
      {currentTab === "passenger" && (
        <div className="p-6 border rounded-lg shadow-md bg-gray-50">
          <h2 className="text-2xl font-semibold mb-4">🧍 Passenger Panel</h2>

          <input
            type="number"
            placeholder="Enter Trip ID"
            value={viewTripId}
            onChange={(e) => setViewTripId(e.target.value)}
            className="w-full p-2 border border-gray-300 rounded-md mb-4 focus:outline-none focus:ring-2 focus:ring-purple-500"
          />
          <button onClick={fetchTrip} className="px-6 py-2 bg-purple-500 text-white rounded-md hover:bg-purple-600">View Trip</button>

          {tripData && (
            <div className="mt-6 p-4 border rounded-lg bg-white">
              <h3 className="text-xl font-medium mb-2">Trip Details</h3>
              <pre className="bg-gray-100 p-3 rounded-md border border-gray-200 overflow-auto">{JSON.stringify(tripData, null, 2)}</pre>

              <h3 className="text-xl font-medium mt-4 mb-2">QR Code</h3>
              <QRCode.default
                value={JSON.stringify(tripData)}
                size={180}
                fgColor="#000000"
                bgColor="#ffffff"
                level="M"
                className="p-2 border border-gray-300 rounded-md"
              />
            </div>
          )}
        </div>
      )}
    </div>
  );
}
```
