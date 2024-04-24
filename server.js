const fs = require('fs');
const path = require('path');
const express = require('express');
const mysql = require('mysql');
const bodyParser = require('body-parser');
const cors = require('cors');

const app = express();
app.use(bodyParser.json()); // for parsing application/json
app.use(cors());

const DATA_PATH = path.join(__dirname, 'seats.json');

// GET seats
app.get('/get-seats', (req, res) => {
  fs.readFile(DATA_PATH, 'utf8', (err, data) => {
    if (err) {
      console.error("Error reading the seats file:", err);
      res.status(500).send('Error reading seat data.');
      return;
    }
    res.json(JSON.parse(data));
  });
});

// POST save seat
app.post('/save-seat', (req, res) => {
  const { seatNo, row } = req.body;

  // console.log('Received row:', row); // Log to check what's being received

  // Check if 'row' is a string and handle it if not
  if (typeof row !== 'string') {
    // console.error('Row is not a string:', row);
    return res.status(400).send('Invalid row value; must be a string');
  }

  const rowKey = row.toLowerCase();

  fs.readFile(DATA_PATH, 'utf8', (err, data) => {
    if (err) {
      console.error("Error reading the seats file:", err);
      res.status(500).send('Error reading seat data');
      return;
    }

    const seats = JSON.parse(data);
    const rowKey = row.toLowerCase();
    if (!seats.pvr[0][rowKey]) {
      seats.pvr[0][rowKey] = [];
    }
    if (!seats.pvr[0][rowKey].includes(seatNo)) {
      seats.pvr[0][rowKey].push(seatNo);
    }

    fs.writeFile(DATA_PATH, JSON.stringify(seats, null, 2), (err) => {
      if (err) {
        console.error("Error writing the seats file:", err);
        res.status(500).send('Failed to update seat data');
        return;
      }
      res.send('Seat updated successfully');
    });
  });
});


// Set up MySQL connection
const dbConfig = {
  host: 'localhost',
  user: 'root',
  password: '12345',
  database: 'booking',
};

let connection = mysql.createConnection(dbConfig);

connection.connect(err => {
  if (err) {
    console.error('Failed to connect to the database:', err);
    process.exit(1); // Exit process if we can't connect to the database
  }
  console.log('Connected to the database successfully!');
});

// Endpoint to receive data and save it to the database
app.post('/save-payment', (req, res) => {
  const { seat_id, mail_id, reference_no, time_stamp } = req.body;

  if (!Number.isInteger(reference_no)) {
    return res.status(400).json({ error: "Invalid reference number; must be an integer" });
  }

  const query = 'INSERT INTO payments (seat_id, mail_id, reference_no, time_stamp) VALUES (?, ?, ?, ?)';

  connection.query(query, [seat_id, mail_id, reference_no, time_stamp], (err, results) => {
    if (err) {
      console.error('Error in saving to database:', err);
      return res.status(500).json({ error: 'Error in saving data' });
    }

    res.json({ 
      message: 'Thank you for confirmation! Your movie ticket will be shared via email within 24 hours. For assistance, please contact us on WhatsApp: <a href="https://wa.me/919656709933?text=Hello!%20I%20need%20help." target="_blank">WhatsApp Support</a>.' 
  });
  
  });
});

function handleDisconnect() {
  connection = mysql.createConnection(dbConfig);
  connection.connect(err => {
    if (err) {
      console.error('Error when reconnecting to db:', err);
      setTimeout(handleDisconnect, 2000);
    }
  });
  connection.on('error', err => {
    console.log('Database error', err);
    if (err.code === 'PROTOCOL_CONNECTION_LOST') {
      handleDisconnect();
    } else {
      throw err;
    }
  });
}

handleDisconnect();

const port = 3000;
app.listen(port, () => {
  console.log(`Server running on port ${port}`);
});
