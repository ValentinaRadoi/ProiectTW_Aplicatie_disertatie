const express = require('express');
const mysql = require('mysql2');
const cors = require('cors');
const bcrypt = require('bcryptjs');
const fileUpload = require('express-fileupload');
const app = express();
const port = 3000;

// middleware
app.use(express.json());
app.use(cors());
app.use(fileUpload());

// configurare baza de date
const db = mysql.createConnection({
  host: 'localhost',
  user: 'root',
  password: '1234',
  database: 'disertatie',
});

// verificam conexiunea la baza de date
db.connect((err) => {
  if (err) {
    console.error('Eroare la conectarea la baza de date:', err);
  } else {
    console.log('Conectat la baza de date MySQL');
  }
});

// endpoint de autentificare
app.post('/api/login', (req, res) => {
  const { email, password } = req.body;

  db.query('SELECT * FROM users WHERE email = ?', [email], (err, rows) => {
    if (err) return res.status(500).send('Eroare la autentificare');

    if (rows.length === 0) return res.status(401).send('Email sau parolă greșite');

    const user = rows[0];

    bcrypt.compare(password, user.password, (err, isMatch) => {
      if (err) return res.status(500).send('Eroare la autentificare');
      if (!isMatch) return res.status(401).send('Email sau parolă greșite');

      res.json({ id: user.id, email: user.email, role: user.role });
    });
  });
});

// endpoint pentru trimiterea cererilor de catre studenti
app.post('/api/applications', (req, res) => {
    const { student_id, session_id } = req.body;
  
    if (!student_id || !session_id) {
      return res.status(400).json({ message: 'Student ID și Session ID sunt obligatorii' });
    }
  
    // inseram cererea in baza de date
    db.query(
      'INSERT INTO applications (student_id, session_id, status) VALUES (?, ?, ?)',
      [student_id, session_id, 'pending'],
      (err) => {
        if (err) {
          console.error('Eroare la trimiterea cererii:', err);
          return res.status(500).json({ message: 'Eroare la trimiterea cererii' });
        }
        res.status(201).json({ message: 'Cererea a fost trimisă cu succes' });
      }
    );
  });
  
  // endpoint pentru aprobare cerere de catre profesori
app.put('/api/applications/:id/approve', (req, res) => {
    const { id } = req.params;
  
    // verificam daca cererea exista
    db.query(
      'SELECT student_id, session_id FROM applications WHERE id = ?',
      [id],
      (err, rows) => {
        if (err) {
          console.error('Eroare la verificarea cererii:', err);
          return res.status(500).json({ message: 'Eroare la verificarea cererii' });
        }
        if (rows.length === 0) {
          return res.status(404).json({ message: 'Cererea nu a fost găsită' });
        }
  
        const { student_id, session_id } = rows[0];
  
        // verificam daca studentul are deja o cerere aprobata
        db.query(
          'SELECT * FROM applications WHERE student_id = ? AND status = ?',
          [student_id, 'approved'],
          (err, result) => {
            if (err) {
              console.error('Eroare la verificarea cererilor aprobate:', err);
              return res.status(500).json({ message: 'Eroare la verificarea cererilor aprobate' });
            }
  
            if (result.length > 0) {
              return res.status(400).json({ message: 'Studentul are deja o cerere aprobată' });
            }
  
            // verificam limita de studenti pentru sesiune
            db.query(
              'SELECT COUNT(*) AS count FROM applications WHERE session_id = ? AND status = ?',
              [session_id, 'approved'],
              (err, result) => {
                if (err) {
                  console.error('Eroare la verificarea limitelor:', err);
                  return res.status(500).json({ message: 'Eroare la verificarea limitelor' });
                }
  
                const approvedCount = result[0].count;
                db.query(
                  'SELECT max_students FROM sessions WHERE id = ?',
                  [session_id],
                  (err, rows) => {
                    if (err) {
                      console.error('Eroare la obținerea sesiunii:', err);
                      return res.status(500).json({ message: 'Eroare la obținerea sesiunii' });
                    }
  
                    const maxStudents = rows[0].max_students;
                    if (approvedCount >= maxStudents) {
                      return res.status(400).json({ message: 'Limita de studenți a fost atinsă' });
                    }
  
                    // aprobam cererea
                    db.query(
                      'UPDATE applications SET status = ? WHERE id = ?',
                      ['approved', id],
                      (err) => {
                        if (err) {
                          console.error('Eroare la aprobarea cererii:', err);
                          return res.status(500).json({ message: 'Eroare la aprobarea cererii' });
                        }
                        res.json({ message: 'Cererea a fost aprobată' });
                      }
                    );
                  }
                );
              }
            );
          }
        );
      }
    );
  });

  // endpoint pentru respingerea cererilor de catre profesori
app.put('/api/applications/:id/reject', (req, res) => {
    const { id } = req.params;
    const { justification } = req.body;
  
    if (!justification) {
      return res.status(400).json({ message: 'Justificarea este obligatorie pentru respingere' });
    }
  
    db.query(
      'UPDATE applications SET status = ?, justification = ? WHERE id = ?',
      ['rejected', justification, id],
      (err, result) => {
        if (err) {
          console.error('Eroare la respingerea cererii:', err);
          return res.status(500).json({ message: 'Eroare la respingerea cererii' });
        }
  
        if (result.affectedRows === 0) {
          return res.status(404).json({ message: 'Cererea nu a fost găsită' });
        }
  
        res.json({ message: 'Cererea a fost respinsă cu succes' });
      }
    );
  });
  
  

// endpoint pentru obtinerea cererilor asociate unui profesor
app.get('/api/applications', (req, res) => {
    const professorId = req.query.professor_id;
  
    if (!professorId) {
      return res.status(400).json({ message: 'ID-ul profesorului este necesar' });
    }
  
    const query = `
      SELECT applications.id, applications.student_id, applications.session_id, applications.status, applications.student_file_path
      FROM applications
      INNER JOIN sessions ON applications.session_id = sessions.id
      WHERE sessions.professor_id = ?;
    `;
  
    db.query(query, [professorId], (err, rows) => {
      if (err) {
        console.error('Eroare la obținerea cererilor:', err);
        return res.status(500).json({ message: 'Eroare la obținerea cererilor' });
      }
  
      res.json(rows);
    });
  });

// endpoint pentru obtinerea sesiunilor
app.get('/api/sessions', (req, res) => {
  db.query('SELECT * FROM sessions', (err, rows) => {
    if (err) return res.status(500).send('Eroare la obținerea sesiunilor');
    res.json(rows);
  });
});

// endpoint pentru incarcarea fisierelor de cstre studenti
app.post('/api/upload', (req, res) => {
  if (!req.files || !req.files.file) {
    return res.status(400).json({ message: 'Nu a fost încărcat niciun fișier' });
  }

  const file = req.files.file;
  const student_id = req.body.student_id;

  if (!student_id) {
    return res.status(400).json({ message: 'ID-ul studentului este obligatoriu' });
  }

  const uploadPath = `${__dirname}/uploads/students/${file.name}`;

  file.mv(uploadPath, (err) => {
    if (err) {
      console.error('Eroare la salvarea fișierului:', err);
      return res.status(500).json({ message: 'Eroare la salvarea fișierului' });
    }

    db.query(
      'UPDATE applications SET student_file_path = ? WHERE student_id = ? AND status = ?',
      [uploadPath, student_id, 'approved'],
      (err, result) => {
        if (err) {
          console.error('Eroare la actualizarea aplicației:', err);
          return res.status(500).json({ message: 'Eroare la actualizarea aplicației' });
        }

        if (result.affectedRows === 0) {
          return res.status(404).json({ message: 'Nu există nicio cerere aprobată pentru acest student' });
        }

        res.json({ message: 'Fișierul a fost încărcat cu succes' });
      }
    );
  });
});

// endpoint pentru încarcarea fisierelor de catre profesori
app.post('/api/applications/:id/upload', (req, res) => {
  const { id } = req.params;

  if (!req.files || !req.files.file) {
    return res.status(400).json({ message: 'Nu a fost încărcat niciun fișier' });
  }

  const file = req.files.file;
  const uploadPath = `${__dirname}/uploads/professors/${file.name}`;

  file.mv(uploadPath, (err) => {
    if (err) {
      console.error('Eroare la salvarea fișierului:', err);
      return res.status(500).json({ message: 'Eroare la salvarea fișierului' });
    }

    db.query(
      'UPDATE applications SET professor_file_path = ? WHERE id = ?',
      [uploadPath, id],
      (err, result) => {
        if (err) {
          console.error('Eroare la actualizarea aplicației:', err);
          return res.status(500).json({ message: 'Eroare la actualizarea aplicației' });
        }

        if (result.affectedRows === 0) {
          return res.status(404).json({ message: 'Cererea nu a fost găsită' });
        }

        res.json({ message: 'Fișierul a fost încărcat cu succes de către profesor' });
      }
    );
  });
});

// pornim serverul
app.listen(port, () => {
  console.log(`Serverul rulează la http://localhost:${port}`);
});
