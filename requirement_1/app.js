const express = require('express');
const multer = require('multer');
const fs = require('fs');

const app = express();
const upload = multer({ dest: 'uploads/' });

app.post('/upload', upload.single('file'), (req, res) => {
    // Assuming 'file' is the field name in the form data

    // Access uploaded file details
    const file = req.file;

    // Move the file to a specified location (e.g., using fs.renameSync)
    fs.renameSync(file.path, `uploads/${file.originalname}`);

    res.send('File uploaded successfully');
});

app.get('/download/:filename', (req, res) => {
    const filename = req.params.filename;

    // Check if the file exists
    if (fs.existsSync(`uploads/${filename}`)) {
        res.sendFile(`${__dirname}/uploads/${filename}`);
    } else {
        res.status(404).send('File not found');
    }
});

app.delete('/delete/:filename', (req, res) => {
    const filename = req.params.filename;

    // Check if the file exists
    if (fs.existsSync(`uploads/${filename}`)) {
        // Delete the file
        fs.unlinkSync(`uploads/${filename}`);
        res.send('File deleted successfully');
    } else {
        res.status(404).send('File not found');
    }
});



app.listen(3000, () => {
    console.log('Server is running on port 3000');
});
