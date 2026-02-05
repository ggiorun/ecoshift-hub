const express = require('express');
const cors = require('cors');
const db = require('./database');
const { GoogleGenAI } = require("@google/genai");
const app = express();
const PORT = process.env.PORT || 3000;

app.use(cors());
app.use(express.json());

// Initialize Gemini AI on the server side
const aiKey = process.env.GEMINI_API_KEY || process.env.API_KEY;
const genAI = aiKey ? new GoogleGenAI(aiKey) : null;

// Helper function for AI matching fallback
function getLocalFallbackReason(user, trip) {
    const skills = user.skills || [];
    const needs = user.accessibilityNeeds || [];
    const matchingSkills = skills.filter(s => trip.tutoringSubject?.toLowerCase().includes(s.toLowerCase()));
    const needsAssistance = needs.length > 0 && trip.assistanceOffered;

    if (needsAssistance) {
        return `Questo viaggio supporta la Missione 5 del PNRR: il conducente offre l'assistenza specifica di cui hai bisogno per un tragitto inclusivo.`;
    }
    if (matchingSkills.length > 0 && trip.tutoringSubject) {
        return `Match perfetto per la Missione 4! Puoi ripassare ${trip.tutoringSubject} durante il tragitto, ottimizzando il tuo tempo di studio.`;
    }
    if (trip.tutoringSubject) {
        return `Interessante opportunità di Peer Tutoring (Missione 4) in ${trip.tutoringSubject} per ampliare le tue conoscenze durante lo spostamento.`;
    }
    return `Ottima scelta per la Missione 3: riduci le emissioni di CO2 e accumuli crediti per la tua mobilità sostenibile universitaria.`;
}

// AI Match reasoning endpoint
app.post('/api/ai/match-reason', async (req, res) => {
    const { user, trip } = req.body;
    
    if (!genAI) {
        return res.json({ reason: getLocalFallbackReason(user, trip) });
    }

    try {
        const model = genAI.getGenerativeModel({ model: "gemini-1.5-flash" });
        const prompt = `
            Agisci come un assistente di mobilità inclusiva. 
            Analizza questo match tra un utente e un viaggio:
            UTENTE: ${user.name}, Competenze: ${(user.skills || []).join(', ')}, Bisogni: ${(user.accessibilityNeeds || []).join(', ')}.
            VIAGGIO: Da ${trip.from} a ${trip.to}, Tutoring offerto in: ${trip.tutoringSubject || 'Nessuno'}, Assistenza disabili: ${trip.assistanceOffered ? 'Sì' : 'No'}.
            
            Spiega in una sola frase breve e incoraggiante perché questo viaggio è ideale per l'utente, citando i benefici PNRR (Missione 4: studio, Missione 5: inclusione).
        `;

        const result = await model.generateContent(prompt);
        const response = await result.response;
        const text = response.text().trim();
        
        res.json({ reason: text || getLocalFallbackReason(user, trip) });
    } catch (error) {
        console.error("Gemini Server Error:", error.message);
        res.json({ reason: getLocalFallbackReason(user, trip) });
    }
});

// --- Users ---
app.get('/api/users', async (req, res) => {
    try {
        const rows = await db.query('SELECT * FROM users');
        const users = rows.map(u => ({
            ...u,
            skills: JSON.parse(u.skills || '[]'),
            accessibilityNeeds: JSON.parse(u.accessibilityNeeds || '[]')
        }));
        res.json(users);
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

app.post('/api/users', async (req, res) => {
    const user = req.body;
    const sql = `INSERT OR REPLACE INTO users (id, name, role, skills, accessibilityNeeds, credits, password) 
               VALUES (?, ?, ?, ?, ?, ?, ?)`;
    const params = [
        user.id,
        user.name,
        user.role,
        JSON.stringify(user.skills),
        JSON.stringify(user.accessibilityNeeds),
        user.credits,
        user.password
    ];

    try {
        await db.query(sql, params);
        res.json({ message: 'User saved', id: user.id });
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

app.post('/api/users/:id/credits', async (req, res) => {
    const { amount } = req.body;
    const sql = `UPDATE users SET credits = credits + ? WHERE id = ?`;

    try {
        await db.query(sql, [amount, req.params.id]);
        const rows = await db.query('SELECT * FROM users WHERE id = ?', [req.params.id]);
        const row = rows[0];
        if (row) {
            row.skills = JSON.parse(row.skills || '[]');
            row.accessibilityNeeds = JSON.parse(row.accessibilityNeeds || '[]');
        }
        res.json(row);
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

// --- Trips ---
app.get('/api/trips', async (req, res) => {
    try {
        const rows = await db.query('SELECT * FROM trips');
        const trips = rows.map(t => ({
            ...t,
            from: t.fromLoc,
            to: t.toLoc,
            specialEquipment: JSON.parse(t.specialEquipment || '[]'),
            passengerIds: JSON.parse(t.passengerIds || '[]'),
            assistanceOffered: !!t.assistanceOffered
        }));
        res.json(trips);
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

app.post('/api/trips', async (req, res) => {
    const trip = req.body;
    const sql = `INSERT OR REPLACE INTO trips (id, driverId, driverName, fromLoc, toLoc, departureTime, seatsAvailable, distanceKm, co2Saved, tutoringSubject, assistanceOffered, specialEquipment, passengerIds) 
               VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`;
    const params = [
        trip.id,
        trip.driverId,
        trip.driverName,
        trip.from,
        trip.to,
        trip.departureTime,
        trip.seatsAvailable,
        trip.distanceKm,
        trip.co2Saved,
        trip.tutoringSubject,
        trip.assistanceOffered ? 1 : 0,
        JSON.stringify(trip.specialEquipment),
        JSON.stringify(trip.passengerIds)
    ];

    try {
        await db.query(sql, params);
        res.json({ message: 'Trip saved', id: trip.id });
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

app.delete('/api/trips/:id', async (req, res) => {
    try {
        await db.query('DELETE FROM trips WHERE id = ?', [req.params.id]);
        res.json({ message: 'Trip deleted' });
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

// --- Notifications ---
app.get('/api/notifications', async (req, res) => {
    const userId = req.query.userId;
    if (!userId) return res.json([]);

    try {
        const rows = await db.query('SELECT * FROM notifications WHERE userId = ? ORDER BY timestamp DESC', [userId]);
        const notifs = rows.map(n => ({
            ...n,
            read: !!n.read
        }));
        res.json(notifs);
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

app.post('/api/notifications', async (req, res) => {
    const n = req.body;
    const sql = `INSERT INTO notifications (id, userId, text, read, type, timestamp) VALUES (?, ?, ?, ?, ?, ?)`;
    try {
        await db.query(sql, [n.id, n.userId, n.text, n.read ? 1 : 0, n.type, n.timestamp]);
        res.json({ message: 'Notification added' });
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

app.put('/api/notifications/:id/read', async (req, res) => {
    try {
        await db.query('UPDATE notifications SET read = 1 WHERE id = ?', [req.params.id]);
        res.json({ message: 'Marked as read' });
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

// --- Chat Messages ---
app.get('/api/messages/:tripId', async (req, res) => {
    try {
        const rows = await db.query('SELECT * FROM messages WHERE tripId = ? ORDER BY timestamp ASC', [req.params.tripId]);
        res.json(rows);
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

app.post('/api/messages', async (req, res) => {
    const m = req.body;
    const sql = `INSERT INTO messages (id, tripId, senderId, senderName, text, timestamp) VALUES (?, ?, ?, ?, ?, ?)`;
    try {
        await db.query(sql, [m.id, m.tripId, m.senderId, m.senderName, m.text, m.timestamp]);
        res.json({ message: 'Message sent' });
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

// --- Credit Logs ---
app.get('/api/credit-logs/:userId', async (req, res) => {
    try {
        const rows = await db.query('SELECT * FROM credit_logs WHERE userId = ? ORDER BY timestamp DESC', [req.params.userId]);
        res.json(rows);
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

app.post('/api/credit-logs', async (req, res) => {
    const l = req.body;
    const sql = `INSERT INTO credit_logs (id, userId, amount, reason, timestamp) VALUES (?, ?, ?, ?, ?)`;
    try {
        await db.query(sql, [l.id, l.userId, l.amount, l.reason, l.timestamp]);
        res.json({ message: 'Log added' });
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

// Proxy for Real-Time Train Data (ViaggiaTreno)
app.get('/api/trains/departures/:stationId', async (req, res) => {
    const stationId = req.params.stationId;
    let timestamp = Date.now();
    if (req.query.time) {
        const parsed = new Date(req.query.time).getTime();
        if (!isNaN(parsed)) timestamp = parsed;
    }
    const dateObj = new Date(timestamp);
    const url = `http://www.viaggiatreno.it/infomobilita/resteasy/viaggiatreno/partenze/${stationId}/${encodeURIComponent(dateObj.toString())}`;

    try {
        const response = await fetch(url);
        if (!response.ok) throw new Error('Failed to fetch from ViaggiaTreno');
        const data = await response.json();
        res.json(data);
    } catch (err) {
        console.error("Proxy error:", err);
        res.status(500).json({ error: 'Failed to fetch real-time train data' });
    }
});

app.get('/api/study-groups', async (req, res) => {
    try {
        const rows = await db.query('SELECT * FROM study_groups');
        const groups = rows.map(g => ({
            ...g,
            from: g.fromLoc,
            members: JSON.parse(g.members || '[]')
        }));
        res.json(groups);
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

app.post('/api/study-groups', async (req, res) => {
    const g = req.body;
    const sql = `INSERT INTO study_groups (id, trainNumber, trainLine, departureTime, subject, fromLoc, creatorId, members, maxMembers) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)`;
    try {
        await db.query(sql, [
            g.id,
            g.trainNumber,
            g.trainLine,
            g.departureTime,
            g.subject,
            g.from,
            g.creatorId,
            JSON.stringify(g.members),
            g.maxMembers
        ]);
        res.json({ message: 'Study group created' });
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

app.post('/api/study-groups/:id/join', async (req, res) => {
    const { userId } = req.body;
    try {
        const rows = await db.query('SELECT members, maxMembers FROM study_groups WHERE id = ?', [req.params.id]);
        if (rows.length === 0) return res.status(404).json({ error: 'Group not found' });

        let members = JSON.parse(rows[0].members || '[]');
        if (members.includes(userId)) return res.json({ message: 'Already joined' });
        if (members.length >= rows[0].maxMembers) return res.status(400).json({ error: 'Group full' });

        members.push(userId);
        await db.query('UPDATE study_groups SET members = ? WHERE id = ?', [JSON.stringify(members), req.params.id]);
        res.json({ message: 'Joined group', members });
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

module.exports = app;

if (require.main === module) {
    app.listen(PORT, () => {
        console.log(`Server running on http://localhost:${PORT}`);
    });
}