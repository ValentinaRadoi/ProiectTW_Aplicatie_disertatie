// simulam un utilizator autentificat
let currentUser = null;

// functia pentru trimiterea datelor catre server
function sendData(url, data, method = 'POST', callback) {
    fetch(url, {
        method: method,
        headers: {
            'Content-Type': 'application/json',
        },
        body: JSON.stringify(data),
    })
    .then(response => {
        if (!response.ok) {
            throw new Error('Eroare la server');
        }
        return response.json();
    })
    .then(data => {
        callback(data);
    })
    .catch(error => {
        console.error('Eroare:', error);
        alert('A apărut o eroare!');
    });
}

// Autentificarea utilizatorului
document.getElementById('loginForm').addEventListener('submit', function(event) {
    event.preventDefault();

    const email = document.getElementById('email').value;
    const password = document.getElementById('password').value;

    const loginData = { email, password };

    fetch('http://localhost:3000/api/login', {
        method: 'POST',
        headers: {
            'Content-Type': 'application/json',
        },
        body: JSON.stringify(loginData),
    })
    .then(response => {
        if (!response.ok) {
            throw new Error('Autentificare eșuată');
        }
        return response.json();
    })
    .then(data => {
        currentUser = data;
        alert(`${data.role.charAt(0).toUpperCase() + data.role.slice(1)} autentificat!`);
        if (data.role === 'student') {
            showStudentSection();
        } else if (data.role === 'professor') {
            showProfessorSection();
        }
    })
    .catch(error => {
        console.error('Eroare la autentificare:', error);
        alert('Email sau parolă greșite!');
    });
});

// afisarea sectiunii pentru studenti
function showStudentSection() {
    document.getElementById('authSection').style.display = 'none';
    document.getElementById('studentSection').style.display = 'block';

    fetch('http://localhost:3000/api/sessions')
    .then(response => response.json())
    .then(sessions => {
        const sessionSelect = document.getElementById('sessionSelect');
        sessionSelect.innerHTML = '<option value="">Alege sesiune</option>'; // Resetare
        sessions.forEach(session => {
            const option = document.createElement('option');
            option.value = session.id;
            option.textContent = `Sesiune: ${session.start_date} - ${session.end_date}`;
            sessionSelect.appendChild(option);
        });
    })
    .catch(error => {
        console.error('Eroare la obținerea sesiunilor:', error);
    });

    document.getElementById('uploadButton').addEventListener('click', function () {
        const fileInput = document.getElementById('fileInput');
        const file = fileInput.files[0];

        if (!file) {
            alert('Selectați un fișier!');
            return;
        }

        const formData = new FormData();
        formData.append('file', file);
        formData.append('student_id', currentUser.id);

        fetch('http://localhost:3000/api/upload', {
            method: 'POST',
            body: formData,
        })
        .then(response => {
            if (!response.ok) {
                throw new Error('Eroare la încărcarea fișierului');
            }
            return response.json();
        })
        .then(data => {
            alert(data.message || 'Fișier încărcat cu succes!');
        })
        .catch(error => {
            console.error('Eroare la încărcare:', error);
            alert('Eroare la încărcarea fișierului');
        });
    });
}

// aplicarea pentru o sesiune
document.getElementById('applyForm').addEventListener('submit', function(event) {
    event.preventDefault();

    const sessionId = document.getElementById('sessionSelect').value;
    if (!sessionId) {
        alert('Alege o sesiune pentru a aplica!');
        return;
    }

    const applicationData = {
        student_id: currentUser.id,
        session_id: sessionId,
    };

    sendData('http://localhost:3000/api/applications', applicationData, 'POST', (data) => {
        alert(data.message || 'Cererea a fost trimisă!');
    });
});

// afisarea sectiunii pentru profesori
function showProfessorSection() {
    document.getElementById('authSection').style.display = 'none';
    document.getElementById('professorSection').style.display = 'block';

    fetch(`http://localhost:3000/api/applications?professor_id=${currentUser.id}`)
    .then(response => response.json())
    .then(applications => {
        const applicationsList = document.getElementById('applicationsList');
        applicationsList.innerHTML = ''; // resetare
        applications.forEach(application => {
            const applicationDiv = document.createElement('div');
            applicationDiv.classList.add('application');
            applicationDiv.innerHTML = `
                <p>Student ID: ${application.student_id}, Sesiune ID: ${application.session_id}, Status: ${application.status}</p>
                <button class="approve">Aprobă</button>
                <button class="reject">Respinge</button>
                <button class="upload">Încarcă răspuns</button>
            `;

            applicationDiv.querySelector('.approve').addEventListener('click', () => {
                sendData(`http://localhost:3000/api/applications/${application.id}/approve`, {}, 'PUT', (data) => {
                    alert(data.message || 'Cererea a fost aprobată!');
                    showProfessorSection();
                });
            });

            applicationDiv.querySelector('.reject').addEventListener('click', () => {
                const justification = prompt('Introduceți justificarea pentru respingere:');
                if (justification) {
                    sendData(`http://localhost:3000/api/applications/${application.id}/reject`, { justification }, 'PUT', (data) => {
                        alert(data.message || 'Cererea a fost respinsă!');
                        showProfessorSection();
                    });
                }
            });

            applicationDiv.querySelector('.upload').addEventListener('click', () => {
                const fileInput = document.createElement('input');
                fileInput.type = 'file';

                fileInput.addEventListener('change', () => {
                    const file = fileInput.files[0];
                    if (!file) return;

                    const formData = new FormData();
                    formData.append('file', file);

                    fetch(`http://localhost:3000/api/applications/${application.id}/upload`, {
                        method: 'POST',
                        body: formData,
                    })
                    .then(response => {
                        if (!response.ok) {
                            throw new Error('Eroare la încărcarea fișierului de către profesor');
                        }
                        return response.json();
                    })
                    .then(data => {
                        alert(data.message || 'Fișier încărcat cu succes de către profesor!');
                    })
                    .catch(error => {
                        console.error('Eroare la încărcarea fișierului:', error);
                    });
                });

                fileInput.click();
            });

            applicationsList.appendChild(applicationDiv);
        });
    })
    .catch(error => {
        console.error('Eroare la obținerea cererilor:', error);
    });
}
