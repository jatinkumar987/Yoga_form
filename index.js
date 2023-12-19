const express = require('express');
const bodyParser = require('body-parser');
const sqlite3 = require('sqlite3').verbose();

const app = express();
const port = 3000;

app.use(bodyParser.urlencoded({ extended: true }));

// Open SQLite database connection
const db = new sqlite3.Database('yoga.db');

// Create Participant table with uniqueness constraint on name
db.run(`
    CREATE TABLE IF NOT EXISTS Participant (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        
        name TEXT NOT NULL,
        age INTEGER NOT NULL,
        batch TEXT NOT NULL,
        registrationDate DATE DEFAULT CURRENT_DATE,
        UNIQUE (name)
    )
`);

// Serve the form
app.get('/', (req, res) => {
    res.sendFile(__dirname + '/form.html');
});

// Handle form submissions
app.post('/submit', (req, res) => {
    const { name, age, batch } = req.body;

    // Check if a participant with the same name already exists
    db.get(
        'SELECT id, age, batch, registrationDate FROM Participant WHERE name = ?',
        [name],
        (err, existingParticipant) => {
            if (err) {
                return res.send('Error checking registration status.');
            }

            if (existingParticipant) {
                // Check if the age and batch are the same
                if (existingParticipant.age === parseInt(age) && existingParticipant.batch === batch) {
                    // Check if one month has elapsed since registration
                    const today = new Date();
                    const registrationDate = new Date(existingParticipant.registrationDate);
                    const oneMonthAgo = new Date(today);
                    oneMonthAgo.setMonth(today.getMonth() - 1);

                    if (registrationDate > oneMonthAgo) {
                        // Participant cannot change batch within one month
                        return res.send('Error: Already registered');
                    }
                } else {
                    // Name is same but age or batch is different
                    return res.send('Error: You cannot change the batch wait for 1 month');
                }
            }

            // No participant with the same name or waiting period elapsed, proceed with registration
            db.run(
                'INSERT INTO Participant (name, age, batch) VALUES (?, ?, ?)',
                [name, age, batch],
                (err) => {
                    if (err) {
                        return res.send('Error submitting the form.');
                    }

                    // Redirect to the payment page on successful form submission
                    res.redirect('/payment');
                }
            );
        }
    );
});

// Serve the payment page
app.get('/payment', (req, res) => {
    res.sendFile(__dirname + '/payment.html');
});

app.listen(port, () => {
    console.log(`Server is running at http://localhost:${port}`);
});
