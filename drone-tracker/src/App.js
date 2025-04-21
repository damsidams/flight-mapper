// src/App.js
import React, { useState, useEffect } from 'react';
import { MapContainer, TileLayer, Marker, Popup, Polyline } from 'react-leaflet';
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

function App() {
  const [drone1Position, setDrone1Position] = useState(INITIAL_POSITION.drone1);
  const [drone2Position, setDrone2Position] = useState(INITIAL_POSITION.drone2);
  const [drone1Path, setDrone1Path] = useState([[INITIAL_POSITION.drone1.lat, INITIAL_POSITION.drone1.lng]]);
  const [drone2Path, setDrone2Path] = useState([[INITIAL_POSITION.drone2.lat, INITIAL_POSITION.drone2.lng]]);
  const [centerPosition, setCenterPosition] = useState(INITIAL_POSITION.center);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState(null);

  useEffect(() => {
    const interval = setInterval(fetchDronePositions, 1000);
    fetchDronePositions();
    return () => clearInterval(interval);
  }, []);

  const fetchDronePositions = async () => {
    try {
      const [drone1Response, drone2Response] = await Promise.all([
        axios.get('/api/drone1-position'),
        axios.get('/api/drone2-position')
      ]);
      
      const drone1Data = drone1Response.data;
      const drone2Data = drone2Response.data;
      
      setDrone1Position({ lat: drone1Data.lat, lng: drone1Data.lng });
      setDrone2Position({ lat: drone2Data.lat, lng: drone2Data.lng });
      setDrone1Path(prevPath => [...prevPath, [drone1Data.lat, drone1Data.lng]]);
      setDrone2Path(prevPath => [...prevPath, [drone2Data.lat, drone2Data.lng]]);
      
      setCenterPosition({
        lat: (drone1Data.lat + drone2Data.lat) / 2,
        lng: (drone1Data.lng + drone2Data.lng) / 2
      });
      
      setIsLoading(false);
    } catch (error) {
      console.error('Error fetching drone positions:', error);
      setError('Failed to fetch drone positions. Please check server connection.');
      setIsLoading(false);
    }
  };

  if (isLoading) return <div className="loading">Loading drone positions...</div>;
  if (error) return <div className="error">{error}</div>;

  return (
    <div className="app">
      <header className="header">
        <h1>Drone Tracker</h1>
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
            
            <Marker 
              position={[drone1Position.lat, drone1Position.lng]}
              icon={droneIcon1}
              className="marker-icon"
            >
              <Popup>
                <div className="popup-content">
                  <h3>Drone 1</h3>
                  <p>Latitude: {drone1Position.lat.toFixed(6)}</p>
                  <p>Longitude: {drone1Position.lng.toFixed(6)}</p>
                </div>
              </Popup>
            </Marker>
            <Polyline 
              positions={drone1Path}
              color="limegreen"
              weight={5}
              opacity={0.9}
            />
            
            <Marker 
              position={[drone2Position.lat, drone2Position.lng]}
              icon={droneIcon2}
              className="marker-icon"
            >
              <Popup>
                <div className="popup-content">
                  <h3>Drone 2</h3>
                  <p>Latitude: {drone2Position.lat.toFixed(6)}</p>
                  <p>Longitude: {drone2Position.lng.toFixed(6)}</p>
                </div>
              </Popup>
            </Marker>
            <Polyline 
              positions={drone2Path}
              color="orangered"
              weight={5}
              opacity={0.9}
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