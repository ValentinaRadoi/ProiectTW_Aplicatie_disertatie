const mysql = require('mysql2');
const bcrypt = require('bcrypt');

// configurare conexiune la baza de date
const db = mysql.createConnection({
  host: 'localhost',
  user: 'root',
  password: '1234',
  database: 'disertatie'
});

// conectare la baza de date
db.connect((err) => {
  if (err) {
    console.error('Eroare la conectarea la baza de date:', err);
    return;
  }
  console.log('Conectat la baza de date MySQL');
  populateDatabase();
});


function populateDatabase() {
  // parolele clare pentru fiecare utilizator
  const passwords = {
    professor1: 'professor1',
    professor2: 'professor2',
    professor3: 'professor3',
    student1: 'student1',
    student2: 'student2',
    student3: 'student3'
  };

  // criptarea parolelor
  Promise.all([
    bcrypt.hash(passwords.professor1, 10),
    bcrypt.hash(passwords.professor2, 10),
    bcrypt.hash(passwords.professor3, 10),
    bcrypt.hash(passwords.student1, 10),
    bcrypt.hash(passwords.student2, 10),
    bcrypt.hash(passwords.student3, 10)
  ])
  .then((hashedPasswords) => {
    // adaugam utilizatorii cu parolele criptate
    const userQuery = `
      INSERT INTO users (email, password, role) VALUES
      ('professor1@example.com', '${hashedPasswords[0]}', 'professor'),
      ('professor2@example.com', '${hashedPasswords[1]}', 'professor'),
      ('professor3@example.com', '${hashedPasswords[2]}', 'professor'),
      ('student1@example.com', '${hashedPasswords[3]}', 'student'),
      ('student2@example.com', '${hashedPasswords[4]}', 'student'),
      ('student3@example.com', '${hashedPasswords[5]}', 'student');
    `;

    db.query(userQuery, (err, result) => {
      if (err) {
        console.error('Eroare la inserarea utilizatorilor:', err);
        db.end();
        return;
      }

      console.log('Utilizatorii au fost inserați cu succes.');

      // obtinem id-urile profesorilor
      const getProfessorsQuery = `SELECT id FROM users WHERE role = 'professor'`;

      db.query(getProfessorsQuery, (err, results) => {
        if (err) {
          console.error('Eroare la obținerea profesorilor:', err);
          db.end();
          return;
        }

        if (results.length < 3) {
          console.error('Nu sunt suficienți profesori pentru a popula sesiunile.');
          db.end();
          return;
        }

        // creem sesiunile folosind id-urile profesorilor
        const sessionQuery = `
          INSERT INTO sessions (professor_id, start_date, end_date, max_students) VALUES
          (${results[0].id}, '2025-01-23 10:00:00', '2025-01-23 12:00:00', 5),
          (${results[1].id}, '2025-01-24 10:00:00', '2025-01-24 12:00:00', 5),
          (${results[2].id}, '2025-01-25 10:00:00', '2025-01-25 12:00:00', 5);
        `;

        db.query(sessionQuery, (err, result) => {
          if (err) {
            console.error('Eroare la inserarea sesiunilor:', err);
          } else {
            console.log('Sesiunile au fost inserate cu succes.');
          }
          db.end();
        });
      });
    });
  })
  .catch((err) => {
    console.error('Eroare la criptarea parolelor:', err);
    db.end();
  });
}
