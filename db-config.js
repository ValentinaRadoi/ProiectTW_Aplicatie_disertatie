const mysql = require('mysql2');

//configurarea conexiunii
const db = mysql.createConnection({
    host: 'localhost',       
    user: 'root',           
    password: '1234',   
    database: 'disertatie',  
});

//conectarea la baza de date
db.connect(err => {
    if (err) {
        console.error('Eroare la conectarea la baza de date:', err.message);
        return;
    }
    console.log('Conexiunea la baza de date a reușit!');
});

module.exports = db;
