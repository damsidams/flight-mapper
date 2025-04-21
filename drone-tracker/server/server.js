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
    const drone1Data = JSON.parse(fs.readFileSync(drone1FilePath, 'utf8'));
    const drone2Data = JSON.parse(fs.readFileSync(drone2FilePath, 'utf8'));
    
    const movementRange = 1;
    drone1Data.lat += (Math.random() - 0.5) * movementRange;
    drone1Data.lng += (Math.random() - 0.5) * movementRange;
    drone2Data.lat += (Math.random() - 0.5) * movementRange;
    drone2Data.lng += (Math.random() - 0.5) * movementRange;
    
    fs.writeFileSync(drone1FilePath, JSON.stringify(drone1Data));
    fs.writeFileSync(drone2FilePath, JSON.stringify(drone2Data));
    
    res.json({ success: true });
  } catch (error) {
    res.status(500).json({ error: 'Failed to simulate movement' });
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
});