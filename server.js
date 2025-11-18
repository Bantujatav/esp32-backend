const express = require('express');
const WebSocket = require('ws');
const http = require('http');
const cors = require('cors');

const app = express();
app.use(cors());

const server = http.createServer(app);
const wss = new WebSocket.Server({ server });

let viewerClients = new Set();
let latestFrame = null;
let esp32Connected = false;

wss.on('connection', (ws, req) => {
  const url = req.url;
  console.log('New connection:', url);
  
  if (url.includes('/esp32')) {
    // ESP32 connection
    esp32Connected = true;
    console.log('✓ ESP32 connected');
    
    ws.on('message', (data) => {
      latestFrame = data;
      
      // Send to all viewers
      viewerClients.forEach(client => {
        if (client.readyState === WebSocket.OPEN) {
          client.send(data);
        }
      });
    });
    
    ws.on('close', () => {
      esp32Connected = false;
      console.log('✗ ESP32 disconnected');
    });
    
  } else if (url.includes('/viewer')) {
    // Viewer connection
    console.log('✓ Viewer connected');
    viewerClients.add(ws);
    
    // Send latest frame immediately
    if (latestFrame) {
      ws.send(latestFrame);
    }
    
    ws.on('close', () => {
      viewerClients.delete(ws);
      console.log('✗ Viewer disconnected');
    });
  }
});

// Status page
app.get('/', (req, res) => {
  res.json({ 
    status: 'Server running',
    esp32Connected: esp32Connected,
    viewers: viewerClients.size,
    hasFrame: !!latestFrame
  });
});

const PORT = process.env.PORT || 3000;
server.listen(PORT, () => {
  console.log(`🚀 Server running on port ${PORT}`);
});