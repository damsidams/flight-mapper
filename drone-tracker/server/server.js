// server.js
const express = require('express');
const fs = require('fs');
const path = require('path');
const cors = require('cors');
const app = express();
const PORT = process.env.PORT || 5000;

app.use(cors());
app.use(express.json());

const DATA_DIR = path.join(__dirname, 'server', 'data');
const drone1FilePath = path.join(DATA_DIR, 'drone1.json');
const drone2FilePath = path.join(DATA_DIR, 'drone2.json');

// Store drone movement vectors
let drone1Vector = { lat: 0, lng: 0 };
let drone2Vector = { lat: 0, lng: 0 };

// Flight parameters
const FLIGHT_PARAMS = {
  maxSpeed: 0.001,         // Maximum speed per update
  acceleration: 0.0002,    // Acceleration rate
  inertia: 0.85,           // How much previous direction affects new direction (0-1)
  randomFactor: 0.0001,    // Random environmental factors (wind, etc.)
  driftFactor: 0.00005,    // Small consistent drift (electronics/calibration error)
  turnProbability: 0.15,   // Probability of changing direction
};

if (!fs.existsSync(DATA_DIR)) {
  fs.mkdirSync(DATA_DIR, { recursive: true });
}

const initializeDataFiles = () => {
  if (!fs.existsSync(drone1FilePath)) {
    fs.writeFileSync(drone1FilePath, JSON.stringify({ lat: 37.7749, lng: -122.4194 }));
  }
  if (!fs.existsSync(drone2FilePath)) {
    fs.writeFileSync(drone2FilePath, JSON.stringify({ lat: 37.7749, lng: -122.4294 }));
  }
};

initializeDataFiles();

// Helper function for realistic movement
const calculateNewVector = (currentVector, turnProbability) => {
  // Apply inertia to current vector
  const vector = {
    lat: currentVector.lat * FLIGHT_PARAMS.inertia,
    lng: currentVector.lng * FLIGHT_PARAMS.inertia
  };
  
  // Decide if drone should change direction
  if (Math.random() < turnProbability) {
    // Apply acceleration in a new direction
    vector.lat += (Math.random() * 2 - 1) * FLIGHT_PARAMS.acceleration;
    vector.lng += (Math.random() * 2 - 1) * FLIGHT_PARAMS.acceleration;
  } else {
    // Continue acceleration in current direction with slight variation
    vector.lat += Math.sign(vector.lat) * FLIGHT_PARAMS.acceleration * (0.5 + Math.random());
    vector.lng += Math.sign(vector.lng) * FLIGHT_PARAMS.acceleration * (0.5 + Math.random());
  }
  
  // Limit to max speed
  const speed = Math.sqrt(vector.lat * vector.lat + vector.lng * vector.lng);
  if (speed > FLIGHT_PARAMS.maxSpeed) {
    vector.lat = (vector.lat / speed) * FLIGHT_PARAMS.maxSpeed;
    vector.lng = (vector.lng / speed) * FLIGHT_PARAMS.maxSpeed;
  }
  
  // Add random environmental factors and drift
  vector.lat += (Math.random() * 2 - 1) * FLIGHT_PARAMS.randomFactor + FLIGHT_PARAMS.driftFactor;
  vector.lng += (Math.random() * 2 - 1) * FLIGHT_PARAMS.randomFactor + FLIGHT_PARAMS.driftFactor;
  
  return vector;
};

app.get('/api/drone1-position', (req, res) => {
  try {
    const data = fs.readFileSync(drone1FilePath, 'utf8');
    res.json(JSON.parse(data));
  } catch (error) {
    console.error('Error reading drone 1 position:', error);
    res.status(500).json({ error: 'Failed to read drone 1 position' });
  }
});

app.get('/api/drone2-position', (req, res) => {
  try {
    const data = fs.readFileSync(drone2FilePath, 'utf8');
    res.json(JSON.parse(data));
  } catch (error) {
    console.error('Error reading drone 2 position:', error);
    res.status(500).json({ error: 'Failed to read drone 2 position' });
  }
});

app.post('/api/update-drone1', (req, res) => {
  try {
    fs.writeFileSync(drone1FilePath, JSON.stringify(req.body));
    res.json({ success: true });
  } catch (error) {
    res.status(500).json({ error: 'Failed to update drone 1 position' });
  }
});

app.post('/api/update-drone2', (req, res) => {
  try {
    fs.writeFileSync(drone2FilePath, JSON.stringify(req.body));
    res.json({ success: true });
  } catch (error) {
    res.status(500).json({ error: 'Failed to update drone 2 position' });
  }
});

app.get('/api/simulate-movement', (req, res) => {
  try {
    // Read current positions
    const drone1Data = JSON.parse(fs.readFileSync(drone1FilePath, 'utf8'));
    const drone2Data = JSON.parse(fs.readFileSync(drone2FilePath, 'utf8'));
    
    // Calculate new movement vectors
    drone1Vector = calculateNewVector(drone1Vector, FLIGHT_PARAMS.turnProbability);
    drone2Vector = calculateNewVector(drone2Vector, FLIGHT_PARAMS.turnProbability * 1.2); // Drone 2 turns more frequently
    
    // Apply movement vectors to positions
    drone1Data.lat += drone1Vector.lat;
    drone1Data.lng += drone1Vector.lng;
    drone2Data.lat += drone2Vector.lat;
    drone2Data.lng += drone2Vector.lng;
    
    // Write new positions
    fs.writeFileSync(drone1FilePath, JSON.stringify(drone1Data));
    fs.writeFileSync(drone2FilePath, JSON.stringify(drone2Data));
    
    res.json({ 
      success: true,
      drone1: { position: drone1Data, vector: drone1Vector },
      drone2: { position: drone2Data, vector: drone2Vector }
    });
  } catch (error) {
    console.error('Error simulating movement:', error);
    res.status(500).json({ error: 'Failed to simulate movement' });
  }
});

// Reset drone paths to origin with no velocity
app.get('/api/reset-drones', (req, res) => {
  try {
    const drone1Data = { lat: 37.7749, lng: -122.4194 };
    const drone2Data = { lat: 37.7749, lng: -122.4294 };
    
    // Reset vectors to zero
    drone1Vector = { lat: 0, lng: 0 };
    drone2Vector = { lat: 0, lng: 0 };
    
    fs.writeFileSync(drone1FilePath, JSON.stringify(drone1Data));
    fs.writeFileSync(drone2FilePath, JSON.stringify(drone2Data));
    
    console.log('Drones reset to initial positions');
    res.json({ 
      success: true, 
      drone1: drone1Data,
      drone2: drone2Data
    });
  } catch (error) {
    console.error('Error resetting drone positions:', error);
    res.status(500).json({ error: 'Failed to reset drone positions' });
  }
});

app.use(express.static(path.join(__dirname, 'build')));

app.get('/', (req, res) => {
  res.sendFile(path.join(__dirname, 'build', 'index.html'));
});

app.listen(PORT, () => {
  console.log(`Server running on port ${PORT}`);
  console.log(`- Access the app at: http://localhost:${PORT}`);
  console.log(`- Simulate drone movement: http://localhost:${PORT}/api/simulate-movement`);
  console.log(`- Reset drone positions: http://localhost:${PORT}/api/reset-drones`);
});