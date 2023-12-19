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
    db.get('SELECT id, age, batch, registrationDate FROM Participant WHERE name = ?', [name], (err, existingParticipant) => {
        if (err) {
            return res.send('Error checking registration status.');
        }

        if (existingParticipant) {
            // Participant with the same name already exists

            // Check if the age, batch, and one-month condition are met
            const sameAge = existingParticipant.age === parseInt(age);
            const sameBatch = existingParticipant.batch === batch;
            const withinOneMonth = isWithinOneMonth(existingParticipant.registrationDate);

            if (sameAge && sameBatch) {
                // Participant with the same name, age, and batch already registered
                return res.send('Error: Already registered');
            } else if (sameAge && !sameBatch && withinOneMonth) {
                // Same age but different batch, cannot change batch within one month
                return res.send('Error: You cannot change the batch, wait for 1 month');
            } else {
                // More than one month has elapsed or different age, proceed with registration
                db.run('INSERT INTO Participant (name, age, batch) VALUES (?, ?, ?)', [name, age, batch], (err) => {
                    if (err) {
                        return res.send('Error submitting the form.');
                    }
                    res.redirect('/payment');
                });
            }
        } else {
            // No participant with the same name, proceed with registration
            db.run('INSERT INTO Participant (name, age, batch) VALUES (?, ?, ?)', [name, age, batch], (err) => {
                if (err) {
                    return res.send('Error submitting the form.');
                }
                res.redirect('/payment');
            });
        }
    });
});

// Function to check if one month has elapsed
function isWithinOneMonth(registrationDate) {
    const today = new Date();
    const registrationDateObj = new Date(registrationDate);
    const oneMonthAgo = new Date(today);
    oneMonthAgo.setMonth(today.getMonth() - 1);

    return registrationDateObj > oneMonthAgo;
}




// Serve the payment page
app.get('/payment', (req, res) => {
    res.sendFile(__dirname + '/payment.html');
});

app.listen(port, () => {
    console.log(`Server is running at http://localhost:${port}`);
});
