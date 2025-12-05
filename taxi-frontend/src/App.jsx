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
    <div style={{ padding: 30, fontFamily: "Arial" }}>
      <h1>TaxiLedger DApp</h1>

      {/* Navigation */}
      <div style={{ marginBottom: 20 }}>
        <button onClick={() => setCurrentTab("owner")}>Owner Panel</button>
        <button onClick={() => setCurrentTab("driver")}>Driver Panel</button>
        <button onClick={() => setCurrentTab("passenger")}>Passenger Panel</button>
      </div>

      {/* ========================= OWNER PANEL ========================= */}
      {currentTab === "owner" && (
        <div>
          <h2>👑 Owner Panel</h2>
          <input
            type="text"
            placeholder="Driver address"
            value={driverAddress}
            onChange={(e) => setDriverAddress(e.target.value)}
          />
          <button onClick={registerDriver}>Register Driver</button>
          <p>{ownerStatus}</p>
        </div>
      )}

      {/* ========================= DRIVER PANEL ========================= */}
      {currentTab === "driver" && (
        <div>
          <h2>🚖 Driver Panel</h2>
          <input
            type="number"
            placeholder="Distance (meters)"
            value={distance}
            onChange={(e) => setDistance(e.target.value)}
          />
          <input
            type="number"
            placeholder="Duration (seconds)"
            value={duration}
            onChange={(e) => setDuration(e.target.value)}
          />
          <input
            type="text"
            placeholder="Data hash (optional text)"
            value={dataHash}
            onChange={(e) => setDataHash(e.target.value)}
          />
          <button onClick={recordTrip}>Record Trip</button>
          <p>{driverStatus}</p>
        </div>
      )}

      {/* ====================== PASSENGER PANEL ====================== */}
      {currentTab === "passenger" && (
        <div>
          <h2>🧍 Passenger Panel</h2>

          <input
            type="number"
            placeholder="Enter Trip ID"
            value={viewTripId}
            onChange={(e) => setViewTripId(e.target.value)}
          />
          <button onClick={fetchTrip}>View Trip</button>

          {tripData && (
            <div style={{ marginTop: 20 }}>
              <h3>Trip Details</h3>
              <pre>{JSON.stringify(tripData, null, 2)}</pre>

              <h3>QR Code</h3>
              <QRCode.default
                value={JSON.stringify(tripData)}
                size={180}
                fgColor="#000000"
                bgColor="#ffffff"
                level="M"
              />
            </div>
          )}
        </div>
      )}
    </div>
  );
}
