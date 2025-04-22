// src/App.js
import React, { useState, useEffect } from 'react';
import { MapContainer, TileLayer, Marker, Popup, Polyline, useMap } from 'react-leaflet';
import 'leaflet/dist/leaflet.css';
import L from 'leaflet';
import axios from 'axios';
import './App.css';

delete L.Icon.Default.prototype._getIconUrl;
L.Icon.Default.mergeOptions({
  iconRetinaUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.7.1/images/marker-icon-2x.png',
  iconUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.7.1/images/marker-icon.png',
  shadowUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.7.1/images/marker-shadow.png',
});

const droneIcon1 = new L.Icon({
  iconUrl: '/drone1.svg',
  iconSize: [40, 40],
  iconAnchor: [20, 20],
  popupAnchor: [0, -20],
});

const droneIcon2 = new L.Icon({
  iconUrl: '/drone2.svg',
  iconSize: [40, 40],
  iconAnchor: [20, 20],
  popupAnchor: [0, -20],
});

const INITIAL_POSITION = {
  drone1: { lat: 37.7749, lng: -122.4194 },
  drone2: { lat: 37.7749, lng: -122.4294 },
  center: { lat: 37.7749, lng: -122.4244 }
};

// Component to update map center when drones move
function MapCenterUpdater({ center }) {
  const map = useMap();
  
  useEffect(() => {
    map.setView([center.lat, center.lng]);
  }, [center, map]);
  
  return null;
}

// Calculate heading from velocity vector
function calculateHeading(vector) {
  if (vector.lat === 0 && vector.lng === 0) return 0;
  return (Math.atan2(vector.lng, vector.lat) * 180 / Math.PI) + 90;
}

// Trim drone paths to prevent excessive memory usage
function trimPath(path, maxPoints = 100) {
  return path.length > maxPoints ? path.slice(path.length - maxPoints) : path;
}

function App() {
  const [drone1Position, setDrone1Position] = useState(INITIAL_POSITION.drone1);
  const [drone2Position, setDrone2Position] = useState(INITIAL_POSITION.drone2);
  const [drone1Path, setDrone1Path] = useState([[INITIAL_POSITION.drone1.lat, INITIAL_POSITION.drone1.lng]]);
  const [drone2Path, setDrone2Path] = useState([[INITIAL_POSITION.drone2.lat, INITIAL_POSITION.drone2.lng]]);
  const [centerPosition, setCenterPosition] = useState(INITIAL_POSITION.center);
  const [drone1Vector, setDrone1Vector] = useState({ lat: 0, lng: 0 });
  const [drone2Vector, setDrone2Vector] = useState({ lat: 0, lng: 0 });
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState(null);
  const [autoFollow, setAutoFollow] = useState(true);
  
  // Prevent too many points in paths
  const maxPathPoints = 200;

  const fetchDronePositions = async () => {
    try {
      const [drone1Response, drone2Response] = await Promise.all([
        axios.get('/api/drone1-position'),
        axios.get('/api/drone2-position')
      ]);
      
      const drone1Data = drone1Response.data;
      const drone2Data = drone2Response.data;
      
      // Calculate vectors (direction/speed) from position changes
      if (drone1Position.lat !== drone1Data.lat || drone1Position.lng !== drone1Data.lng) {
        setDrone1Vector({
          lat: drone1Data.lat - drone1Position.lat,
          lng: drone1Data.lng - drone1Position.lng
        });
      }
      
      if (drone2Position.lat !== drone2Data.lat || drone2Position.lng !== drone2Data.lng) {
        setDrone2Vector({
          lat: drone2Data.lat - drone2Position.lat,
          lng: drone2Data.lng - drone2Position.lng
        });
      }
      
      setDrone1Position({ lat: drone1Data.lat, lng: drone1Data.lng });
      setDrone2Position({ lat: drone2Data.lat, lng: drone2Data.lng });
      
      // Update paths with new positions and trim if needed
      setDrone1Path(prevPath => {
        const newPath = [...prevPath, [drone1Data.lat, drone1Data.lng]];
        return trimPath(newPath, maxPathPoints);
      });
      
      setDrone2Path(prevPath => {
        const newPath = [...prevPath, [drone2Data.lat, drone2Data.lng]];
        return trimPath(newPath, maxPathPoints);
      });
      
      // Only update center if auto-follow is enabled
      if (autoFollow) {
        setCenterPosition({
          lat: (drone1Data.lat + drone2Data.lat) / 2,
          lng: (drone1Data.lng + drone2Data.lng) / 2
        });
      }
      
      setIsLoading(false);
    } catch (error) {
      console.error('Error fetching drone positions:', error);
      setError('Failed to fetch drone positions. Please check server connection.');
      setIsLoading(false);
    }
  };

  useEffect(() => {
    const interval = setInterval(fetchDronePositions, 1000);
    fetchDronePositions();
    return () => clearInterval(interval);
  }, []);  // eslint-disable-line react-hooks/exhaustive-deps

  const resetDrones = async () => {
    try {
      await axios.get('/api/reset-drones');
      // Reset paths
      setDrone1Path([[INITIAL_POSITION.drone1.lat, INITIAL_POSITION.drone1.lng]]);
      setDrone2Path([[INITIAL_POSITION.drone2.lat, INITIAL_POSITION.drone2.lng]]);
      setDrone1Vector({ lat: 0, lng: 0 });
      setDrone2Vector({ lat: 0, lng: 0 });
      // Force immediate update positions
      setTimeout(fetchDronePositions, 100);
    } catch (error) {
      console.error('Error resetting drones:', error);
    }
  };

  // Calculate rotation styles for drone markers
  const drone1Style = {
    transform: `rotate(${calculateHeading(drone1Vector)}deg)`,
    transition: 'transform 0.5s ease'
  };
  
  const drone2Style = {
    transform: `rotate(${calculateHeading(drone2Vector)}deg)`,
    transition: 'transform 0.5s ease'
  };

  if (isLoading) return <div className="loading">Loading drone positions...</div>;
  if (error) return <div className="error">{error}</div>;

  return (
    <div className="app">
      <header className="header">
        <h1>Drone Tracker</h1>
        <div className="controls">
          <button onClick={resetDrones} className="control-btn reset-btn">Reset Drones</button>
          <label className="toggle-follow">
            <input 
              type="checkbox" 
              checked={autoFollow} 
              onChange={() => setAutoFollow(!autoFollow)} 
            />
            <span>Auto Follow</span>
          </label>
        </div>
        <div className="status-indicators">
          <div className="status-indicator">
            <div className="status-dot drone1"></div>
            <span>Drone 1</span>
          </div>
          <div className="status-indicator">
            <div className="status-dot drone2"></div>
            <span>Drone 2</span>
          </div>
        </div>
      </header>
      
      <main className="content">
        <div className="map-container">
          <MapContainer 
            center={[centerPosition.lat, centerPosition.lng]} 
            zoom={15} 
            style={{ height: "100%", width: "100%" }}
          >
            <TileLayer
              attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors'
              url="https://{s}.basemaps.cartocdn.com/dark_all/{z}/{x}/{y}{r}.png"
            />
            
            {autoFollow && <MapCenterUpdater center={centerPosition} />}
            
            <Marker 
              position={[drone1Position.lat, drone1Position.lng]}
              icon={droneIcon1}
              className="marker-icon"
              // Apply rotation style to markers
              eventHandlers={{
                add: (e) => {
                  if (e.target._icon) {
                    e.target._icon.style.transform += ` rotate(${calculateHeading(drone1Vector)}deg)`;
                  }
                },
                update: (e) => {
                  if (e.target._icon) {
                    e.target._icon.style.transform = 
                      `translate3d(-20px, -20px, 0px) rotate(${calculateHeading(drone1Vector)}deg)`;
                  }
                }
              }}
            >
              <Popup>
                <div className="popup-content">
                  <h3>Drone 1</h3>
                  <p>Latitude: {drone1Position.lat.toFixed(6)}</p>
                  <p>Longitude: {drone1Position.lng.toFixed(6)}</p>
                  <p>Speed: {(Math.sqrt(Math.pow(drone1Vector.lat, 2) + Math.pow(drone1Vector.lng, 2)) * 100000).toFixed(2)} m/s</p>
                </div>
              </Popup>
            </Marker>
            <Polyline 
              positions={drone1Path}
              color="limegreen"
              weight={4}
              opacity={0.8}
            />
            
            <Marker 
              position={[drone2Position.lat, drone2Position.lng]}
              icon={droneIcon2}
              className="marker-icon"
              // Apply rotation style to markers
              eventHandlers={{
                add: (e) => {
                  if (e.target._icon) {
                    e.target._icon.style.transform += ` rotate(${calculateHeading(drone2Vector)}deg)`;
                  }
                },
                update: (e) => {
                  if (e.target._icon) {
                    e.target._icon.style.transform = 
                      `translate3d(-20px, -20px, 0px) rotate(${calculateHeading(drone2Vector)}deg)`;
                  }
                }
              }}
            >
              <Popup>
                <div className="popup-content">
                  <h3>Drone 2</h3>
                  <p>Latitude: {drone2Position.lat.toFixed(6)}</p>
                  <p>Longitude: {drone2Position.lng.toFixed(6)}</p>
                  <p>Speed: {(Math.sqrt(Math.pow(drone2Vector.lat, 2) + Math.pow(drone2Vector.lng, 2)) * 100000).toFixed(2)} m/s</p>
                </div>
              </Popup>
            </Marker>
            <Polyline 
              positions={drone2Path}
              color="orangered"
              weight={4}
              opacity={0.8}
            />
          </MapContainer>
        </div>
        
        <div className="info-panel">
          <div className="drone-info">
            <h2>Drone 1</h2>
            <div className="coordinates">
              <div className="coordinate">
                <span>Latitude:</span>
                <span>{drone1Position.lat.toFixed(6)}</span>
              </div>
              <div className="coordinate">
                <span>Longitude:</span>
                <span>{drone1Position.lng.toFixed(6)}</span>
              </div>
              <div className="coordinate">
                <span>Speed:</span>
                <span>{(Math.sqrt(Math.pow(drone1Vector.lat, 2) + Math.pow(drone1Vector.lng, 2)) * 100000).toFixed(2)} m/s</span>
              </div>
              <div className="coordinate">
                <span>Heading:</span>
                <span>{calculateHeading(drone1Vector).toFixed(1)}°</span>
              </div>
            </div>
          </div>
          
          <div className="drone-info">
            <h2>Drone 2</h2>
            <div className="coordinates">
              <div className="coordinate">
                <span>Latitude:</span>
                <span>{drone2Position.lat.toFixed(6)}</span>
              </div>
              <div className="coordinate">
                <span>Longitude:</span>
                <span>{drone2Position.lng.toFixed(6)}</span>
              </div>
              <div className="coordinate">
                <span>Speed:</span>
                <span>{(Math.sqrt(Math.pow(drone2Vector.lat, 2) + Math.pow(drone2Vector.lng, 2)) * 100000).toFixed(2)} m/s</span>
              </div>
              <div className="coordinate">
                <span>Heading:</span>
                <span>{calculateHeading(drone2Vector).toFixed(1)}°</span>
              </div>
            </div>
          </div>
        </div>
      </main>
      
      <footer className="footer">
        <p>Drone Tracker &copy; 2025</p>
      </footer>
    </div>
  );
}

export default App;