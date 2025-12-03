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
