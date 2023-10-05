const express = require('express');
const multer = require('multer');
const fs = require('fs');
const path = require('path');
const crypto = require('crypto');

const app = express();

// Load filesByHash from a JSON file if it exists
let filesByHash = {};

const FILES_BY_HASH_FILE = path.join(__dirname, 'filesByHash.json');

const saveFilesByHash = () => {
    fs.writeFileSync(FILES_BY_HASH_FILE, JSON.stringify(filesByHash), 'utf-8');
};

const loadFilesByHash = () => {
    if (fs.existsSync(FILES_BY_HASH_FILE)) {
        const data = fs.readFileSync(FILES_BY_HASH_FILE, 'utf-8');
        filesByHash = JSON.parse(data);
    }
};

loadFilesByHash();

// Define storage for uploaded files
const storage = multer.diskStorage({
    destination: (req, file, cb) => {
        const uploadDir = './uploads/';
        fs.mkdirSync(uploadDir, { recursive: true });
        cb(null, uploadDir);
    },
    filename: (req, file, cb) => {
        cb(null, file.originalname);
    }
});

const upload = multer({ storage });

const getFileHash = (filePath) => {
    const hash = crypto.createHash('sha1');
    const fileData = fs.readFileSync(filePath);
    hash.update(fileData);
    return hash.digest('hex');
};

// Upload a new file
app.post('/upload', upload.single('file'), (req, res) => {
    const { file } = req;

    const fileHash = getFileHash(file.path);

    if (filesByHash[fileHash]) {
        fs.unlinkSync(file.path);
        const existingFile = filesByHash[fileHash];
        const symlinkPath = path.join(__dirname, 'uploads', file.originalname);
        fs.symlinkSync(existingFile.path, symlinkPath);
        res.send('File uploaded successfully (reused content)');
    } else {
        filesByHash[fileHash] = { path: file.path, name: file.originalname };
        res.send('File uploaded successfully');

        saveFilesByHash();
    }
});

// Retrieve an uploaded file by name
app.get('/files/:filename', (req, res) => {
    const { filename } = req.params;
    const filePath = path.join(__dirname, 'uploads', filename);

    if (fs.existsSync(filePath)) {
        res.sendFile(filePath);
    } else {
        res.status(404).send('File not found');
    }
});

// Delete an uploaded file by name
app.delete('/files/:filename', (req, res) => {
    const { filename } = req.params;
    const filePath = path.join(__dirname, 'uploads', filename);

    if (fs.existsSync(filePath)) {
        const fileHash = getFileHash(filePath);
        delete filesByHash[fileHash];

        fs.unlinkSync(filePath);
        saveFilesByHash();
        res.send('File deleted successfully');
    } else {
        res.status(404).send('File not found');
    }
});

const PORT = process.env.PORT || 3000;

app.listen(PORT, () => {
    console.log(`Server running on port ${PORT}`);
});
