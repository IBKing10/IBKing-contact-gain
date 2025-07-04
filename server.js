import express from 'express';
import cors from 'cors';
import fs from 'fs/promises';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const app = express();
const PORT = process.env.PORT || 3000;
const CONTACTS_FILE = path.join(__dirname, 'contacts.json');

// Middleware
app.use(cors());
app.use(express.json());
app.use(express.static('.'));

// Ensure contacts.json exists
async function initializeContactsFile() {
    try {
        await fs.access(CONTACTS_FILE);
    } catch (error) {
        // File doesn't exist, create it
        await fs.writeFile(CONTACTS_FILE, JSON.stringify([], null, 2));
    }
}

// API endpoint to submit contact
app.post('/api/submit-contact', async (req, res) => {
    try {
        const { fullName, phoneNumber, timestamp } = req.body;
        
        if (!fullName || !phoneNumber) {
            return res.status(400).json({ error: 'Full name and phone number are required' });
        }
        
        // Read existing contacts
        const contactsData = await fs.readFile(CONTACTS_FILE, 'utf8');
        const contacts = JSON.parse(contactsData);
        
        // Add new contact
        const newContact = {
            id: Date.now().toString(),
            fullName: fullName.trim(),
            phoneNumber: phoneNumber.trim(),
            timestamp: timestamp || new Date().toISOString()
        };
        
        contacts.push(newContact);
        
        // Save updated contacts
        await fs.writeFile(CONTACTS_FILE, JSON.stringify(contacts, null, 2));
        
        res.json({ success: true, message: 'Contact saved successfully' });
    } catch (error) {
        console.error('Error saving contact:', error);
        res.status(500).json({ error: 'Internal server error' });
    }
});

// Admin endpoint to download contacts as VCF
app.get('/admin/download', async (req, res) => {
    try {
        // Read contacts
        const contactsData = await fs.readFile(CONTACTS_FILE, 'utf8');
        const contacts = JSON.parse(contactsData);
        
        if (contacts.length === 0) {
            return res.status(404).send(`
                <!DOCTYPE html>
                <html>
                <head>
                    <title>IBKing Admin - No Contacts</title>
                    <style>
                        body { 
                            font-family: 'Arial', sans-serif; 
                            background: #000; 
                            color: #FFD700; 
                            text-align: center; 
                            padding: 50px; 
                        }
                        h1 { color: #FFD700; text-shadow: 0 0 10px #FFD700; }
                        a { color: #B8860B; text-decoration: none; }
                        a:hover { color: #FFD700; }
                    </style>
                </head>
                <body>
                    <h1>IBKing Admin Portal</h1>
                    <p>No contacts found in the database.</p>
                    <a href="/">← Back to main site</a>
                </body>
                </html>
            `);
        }
        
        // Generate VCF content
        let vcfContent = '';
        
        contacts.forEach(contact => {
            vcfContent += `BEGIN:VCARD\n`;
            vcfContent += `VERSION:3.0\n`;
            vcfContent += `FN:${contact.fullName}\n`;
            vcfContent += `TEL:${contact.phoneNumber}\n`;
            vcfContent += `NOTE:Added via IBKing Contact Gain on ${new Date(contact.timestamp).toLocaleString()}\n`;
            vcfContent += `END:VCARD\n\n`;
        });
        
        // Set headers for file download
        const filename = `ibking-contacts-${new Date().toISOString().split('T')[0]}.vcf`;
        res.setHeader('Content-Type', 'text/vcard');
        res.setHeader('Content-Disposition', `attachment; filename="${filename}"`);
        
        res.send(vcfContent);
    } catch (error) {
        console.error('Error generating VCF:', error);
        res.status(500).send(`
            <!DOCTYPE html>
            <html>
            <head>
                <title>IBKing Admin - Error</title>
                <style>
                    body { 
                        font-family: 'Arial', sans-serif; 
                        background: #000; 
                        color: #FFD700; 
                        text-align: center; 
                        padding: 50px; 
                    }
                    h1 { color: #FF6B6B; }
                    a { color: #B8860B; text-decoration: none; }
                    a:hover { color: #FFD700; }
                </style>
            </head>
            <body>
                <h1>Error</h1>
                <p>An error occurred while generating the contacts file.</p>
                <a href="/">← Back to main site</a>
            </body>
            </html>
        `);
    }
});

// Admin dashboard endpoint
app.get('/admin', async (req, res) => {
    try {
        const contactsData = await fs.readFile(CONTACTS_FILE, 'utf8');
        const contacts = JSON.parse(contactsData);
        
        const html = `
            <!DOCTYPE html>
            <html>
            <head>
                <title>IBKing Admin Dashboard</title>
                <style>
                    body { 
                        font-family: 'Arial', sans-serif; 
                        background: #000; 
                        color: #FFD700; 
                        padding: 20px; 
                        line-height: 1.6;
                    }
                    h1 { 
                        color: #FFD700; 
                        text-shadow: 0 0 10px #FFD700; 
                        text-align: center;
                        margin-bottom: 30px;
                    }
                    .stats {
                        background: rgba(255, 215, 0, 0.1);
                        border: 1px solid #FFD700;
                        border-radius: 10px;
                        padding: 20px;
                        margin-bottom: 30px;
                        text-align: center;
                    }
                    .contact-list {
                        background: rgba(255, 215, 0, 0.05);
                        border: 1px solid #B8860B;
                        border-radius: 10px;
                        padding: 20px;
                    }
                    .contact-item {
                        border-bottom: 1px solid #B8860B;
                        padding: 15px 0;
                    }
                    .contact-item:last-child {
                        border-bottom: none;
                    }
                    .download-btn {
                        background: linear-gradient(135deg, #FFD700, #B8860B);
                        color: #000;
                        padding: 15px 30px;
                        border: none;
                        border-radius: 5px;
                        text-decoration: none;
                        font-weight: bold;
                        display: inline-block;
                        margin: 20px 0;
                        transition: transform 0.3s ease;
                    }
                    .download-btn:hover {
                        transform: translateY(-2px);
                    }
                    .back-link {
                        color: #B8860B;
                        text-decoration: none;
                        margin-top: 20px;
                        display: inline-block;
                    }
                    .back-link:hover {
                        color: #FFD700;
                    }
                </style>
            </head>
            <body>
                <h1>👑 IBKing Admin Dashboard</h1>
                
                <div class="stats">
                    <h2>Total Contacts: ${contacts.length}</h2>
                    <a href="/admin/download" class="download-btn">📥 Download All Contacts (.vcf)</a>
                </div>
                
                <div class="contact-list">
                    <h3>Recent Contacts:</h3>
                    ${contacts.length === 0 ? '<p>No contacts yet.</p>' : 
                        contacts.slice(-10).reverse().map(contact => `
                            <div class="contact-item">
                                <strong>${contact.fullName}</strong><br>
                                📞 ${contact.phoneNumber}<br>
                                <small>Added: ${new Date(contact.timestamp).toLocaleString()}</small>
                            </div>
                        `).join('')
                    }
                </div>
                
                <a href="/" class="back-link">← Back to main site</a>
            </body>
            </html>
        `;
        
        res.send(html);
    } catch (error) {
        console.error('Error loading admin dashboard:', error);
        res.status(500).send('Error loading admin dashboard');
    }
});

// Start server
async function startServer() {
    await initializeContactsFile();
    app.listen(PORT, () => {
        console.log(`🏰 IBKing Contact Gain server running on port ${PORT}`);
        console.log(`📱 Main site: http://localhost:${PORT}`);
        console.log(`👑 Admin panel: http://localhost:${PORT}/admin`);
        console.log(`📥 Download contacts: http://localhost:${PORT}/admin/download`);
    });
}

startServer().catch(console.error);