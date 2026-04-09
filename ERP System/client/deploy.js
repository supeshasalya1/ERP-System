const express = require('express');
const path = require('path');
const { createProxyMiddleware } = require('http-proxy-middleware');
const dotenv = require('dotenv');
dotenv.config();
const app = express();


app.use(express.static(path.join(__dirname, 'build')));
const apiHost = process.env.REACT_APP_API_HOST || '127.0.0.1';
const apiPort = process.env.REACT_APP_API_PORT || '8000';



app.use('/api', createProxyMiddleware({
    target: `http://${apiHost}:${apiPort}`, 
    changeOrigin: true,
}));


app.get('*', (req, res) => {
    res.sendFile(path.join(__dirname, 'build', 'index.html'));
});

const PORT = 3000;
app.listen(PORT, '0.0.0.0', () => {
    console.log(`Server running on http://0.0.0.0:${PORT}`);
});
