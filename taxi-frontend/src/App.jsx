import { useState, useEffect } from "react";
import { ethers } from "ethers";
import taxiAbi from "./abi/TaxiLedger.json";

const CONTRACT_ADDRESS = import.meta.env.VITE_CONTRACT_ADDRESS;

export default function App() {
  const [provider, setProvider] = useState(null);
  const [signer, setSigner] = useState(null);
  const [contract, setContract] = useState(null);
  const [initError, setInitError] = useState(null);

  const [currentTab, setCurrentTab] = useState("owner"); // owner | driver | passenger

  const [hardhatAccounts, setHardhatAccounts] = useState([]);
  const [driverAccount, setDriverAccount] = useState("");
  const [driverSigner, setDriverSigner] = useState(null);

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
        const ownerSigner = prov.getSigner(0); // default Hardhat signer
        const cont = new ethers.Contract(CONTRACT_ADDRESS, taxiAbi.abi, ownerSigner);

        setProvider(prov);
        setSigner(ownerSigner);
        setContract(cont);

        const signers = await prov.listAccounts();
        const accountsWithSigners = await Promise.all(
          signers.map(async (address, index) => ({
            address: address,
            signer: prov.getSigner(index)
          }))
        );
        setHardhatAccounts(accountsWithSigners);

        // Set default driver account to the second one (index 1), assuming first is owner
        if (accountsWithSigners.length > 1) {
          setDriverAccount(accountsWithSigners[1].address);
          setDriverSigner(accountsWithSigners[1].signer);
        }

      } catch (err) {
        console.error(err);
        setInitError(
          "Failed to connect to the blockchain. Please ensure the Hardhat node is running and the contract address in taxi-frontend/.env is correct. Error: " +
            err.message
        );
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
      if (!driverSigner) {
        setDriverStatus("Error: No driver account selected.");
        return;
      }
      const driverContract = new ethers.Contract(CONTRACT_ADDRESS, taxiAbi.abi, driverSigner);

      const hashBytes = ethers.utils.formatBytes32String(dataHash);
      const tx = await driverContract.recordTrip(
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
      {initError && (
        <div
          className="p-4 mb-4 text-sm text-red-700 bg-red-100 rounded-lg"
          role="alert"
        >
          <span className="font-bold">Initialization Error:</span> {initError}
        </div>
      )}
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

          <label htmlFor="driver-select" className="block text-sm font-medium text-gray-700 mb-2">Select Driver Account:</label>
          <select
            id="driver-select"
            value={driverAccount}
            onChange={(e) => {
              const selectedAddress = e.target.value;
              const selectedAccount = hardhatAccounts.find(acc => acc.address === selectedAddress);
              if (selectedAccount) {
                setDriverAccount(selectedAddress);
                setDriverSigner(selectedAccount.signer);
              }
            }}
            className="w-full p-2 border border-gray-300 rounded-md mb-4 focus:outline-none focus:ring-2 focus:ring-green-500"
          >
            {hardhatAccounts.map((acc, index) => (
              <option key={acc.address} value={acc.address}>
                {acc.address} {index === 0 ? "(Owner)" : `(Account ${index})`}
              </option>
            ))}
          </select>

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


            </div>
          )}
        </div>
      )}
    </div>
  );
}