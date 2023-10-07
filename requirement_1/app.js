const express = require('express');
const multer = require('multer');
const fs = require('fs');
const path = require('path');
const crypto = require('crypto');

const app = express();

// Load filesByHash from a JSON file if it exists
let filesByHash = {};
let filesMapping = {}

const UPLOAD_DIR = "uploads"
const FILES_BY_HASH_FILE = path.join(__dirname, 'filesByHash.json');
const FILES_MAPPING_FILE = path.join(__dirname, 'filesMapping.json');

const saveFiles = (filepath, data) => {
    fs.writeFileSync(filepath, JSON.stringify(data), 'utf-8');
};

const loadFiles = (filepath) => {
    if (fs.existsSync(filepath)) {
        const data = fs.readFileSync(filepath, 'utf-8');
        return JSON.parse(data);
    }
    return {};
};

const updateFilesMapping = (filepath) => {
    let mappings = Object.keys(filesMapping).map(key => {
        if (filesMapping[key] == filepath) {
            return key;
        }
    });

    if (mappings.length == 0) {
        return null
    }



    if (mappings.length > 1) {
        for (let index = 1; index < mappings.length; index++) {
            filesMapping[mappings[index]] = path.join(UPLOAD_DIR, mappings[0])
        }
    }

    delete filesMapping[mappings[0]]
    fs.copyFileSync(filepath, path.join(UPLOAD_DIR, mappings[0]))

    return mappings[0]
}


filesByHash = loadFiles(FILES_BY_HASH_FILE);
filesMapping = loadFiles(FILES_MAPPING_FILE);

// Define storage for uploaded files
const storage = multer.diskStorage({
    destination: (req, file, cb) => {
        const uploadDir = './tmp';
        fs.mkdirSync(uploadDir, { recursive: true });
        fs.mkdirSync("./" + UPLOAD_DIR, { recursive: true });
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

const moveFileFromTemporary = (filename) => {
    let source = path.join("tmp", filename)
    let destination = path.join(UPLOAD_DIR, filename)
    fs.copyFileSync(source, destination)
    fs.unlinkSync(source)
}

// Upload a new file
app.post('/upload', upload.single('file'), (req, res) => {
    const { file } = req;
    const fileHash = getFileHash(file.path)
    const fileName = file.originalname;
    const filePath = path.join(UPLOAD_DIR, fileName)

    const existingFileWithSameName = Object.values(filesByHash).find(file => file.name === fileName);

    if (existingFileWithSameName) {
        const oldFileHash = getFileHash(filePath)
        if (oldFileHash === fileHash) {
            res.send('File uploaded successfully (overwite)');
            return
        }
        if (filesByHash[fileHash]) { // File exist but have same content with other file
            fs.unlinkSync(file.path);
            fs.unlinkSync(filePath);
            delete filesByHash[oldFileHash]

            const existingFile = filesByHash[fileHash];
            filesMapping[fileName] = existingFile.path
            res.send('File uploaded successfully (reused content of ' + existingFile.name + ')');

        } else { // File exist with new content
            filesByHash[fileHash] = { path: filePath, name: fileName };
            let updateFile = updateFilesMapping(filePath)
            if (updateFile) {
                // fs.copyFileSync(filePath, path.join(UPLOAD_DIR, updateFile))
                filesByHash[oldFileHash] = { path: path.join(UPLOAD_DIR, updateFile), name: updateFile };
            }
            moveFileFromTemporary(fileName)
            res.send('File uploaded successfully (overwite)');

        }

    } else if (filesByHash[fileHash]) { // New file have same content with other file
        fs.unlinkSync(file.path);

        // File with the same content already exists, create a reference mapping
        const existingFile = filesByHash[fileHash];
        filesMapping[fileName] = existingFile.path
        res.send('File uploaded successfully (reused content of ' + existingFile.name + ')');
    } else {
        // File with this content doesn't exist, store it and update hash mapping & reference mapping
        if (filesMapping[fileName])
            delete filesMapping[fileName];
        filesByHash[fileHash] = { path: filePath, name: fileName };
        moveFileFromTemporary(fileName)
        res.send('File uploaded successfully (new version)');
    }

    // Update the persisted data
    saveFiles(FILES_BY_HASH_FILE, filesByHash);
    saveFiles(FILES_MAPPING_FILE, filesMapping);
});



// Retrieve an uploaded file by name
app.get('/files/:filename', (req, res) => {
    const { filename } = req.params;
    const filePath = path.join(__dirname, 'uploads', filename);

    // Check if the file exists
    if (fs.existsSync(filePath)) {
        res.download(filePath);
    } else if (filesMapping[filename]) {
        res.download(path.resolve(filesMapping[filename]));
    } else {
        res.status(404).send('File not found');
    }
});


// Delete an uploaded file by name
app.delete('/files/:filename', (req, res) => {
    const { filename } = req.params;
    const filePath = path.join('uploads', filename);

    if (fs.existsSync(filePath)) {
        const fileHash = getFileHash(filePath);
        delete filesByHash[fileHash];

        let updateFile = updateFilesMapping(filePath)
        if (updateFile) {
            // fs.copyFileSync(filePath, path.join(UPLOAD_DIR, updateFile))
            filesByHash[fileHash] = { path: path.join(UPLOAD_DIR, updateFile), name: updateFile };
        }
        fs.unlinkSync(filePath);

        res.send('File deleted successfully');
    } else if (filesMapping[filename]) {
        // If file still reference to other file, just remove this reference
        delete filesMapping[filename];
        res.send('File deleted successfully');
    } else {
        res.status(404).send('File not found');
    }

    saveFiles(FILES_BY_HASH_FILE, filesByHash);
    saveFiles(FILES_MAPPING_FILE, filesMapping);
});

const PORT = process.env.PORT || 3000;

app.listen(PORT, () => {
    console.log(`Server running on port ${PORT}`);
});
