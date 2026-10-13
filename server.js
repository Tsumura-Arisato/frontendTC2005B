const express = require('express');
const path = require('path');

const app = express();
const PORT = process.env.PORT || 5173;

app.use(express.static(path.join(__dirname, 'public'), {
    setHeaders: (res, filePath) => {
        if (filePath.endsWith('.br')) {
            res.setHeader('Content-Encoding', 'br');
            if (filePath.endsWith('.wasm.br')) {
                res.setHeader('Content-Type', 'application/wasm');
            } else if (filePath.endsWith('.framework.js.br') || filePath.endsWith('.js.br')) {
                res.setHeader('Content-Type', 'application/javascript');
            } else if (filePath.endsWith('.data.br')) {
                res.setHeader('Content-Type', 'application/octet-stream');
            }
        }
    }
}));

app.listen(PORT, () => {
    console.log(`Servidor del frontend corriendo en http://localhost:${PORT}`);
});