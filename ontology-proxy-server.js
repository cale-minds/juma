'use strict';

const fs = require('fs');
const http = require('http');
const path = require('path');
const {
  handleOntologyProxyRequest,
  sendText,
  writeCorsHeaders
} = require('./ontology-proxy-core');

const ROOT_DIR = __dirname;
const PORT = Number(process.env.JUMA_PROXY_PORT || process.env.PORT || 8787);

const MIME_TYPES = {
  '.css': 'text/css; charset=utf-8',
  '.html': 'text/html; charset=utf-8',
  '.js': 'application/javascript; charset=utf-8',
  '.json': 'application/json; charset=utf-8',
  '.svg': 'image/svg+xml; charset=utf-8',
  '.txt': 'text/plain; charset=utf-8',
  '.ttl': 'text/turtle; charset=utf-8',
  '.xml': 'application/xml; charset=utf-8'
};

function getSafeStaticPath(pathname) {
  const requestedPath = pathname === '/' ? '/index.html' : pathname;
  let decodedPath;
  try {
    decodedPath = decodeURIComponent(requestedPath);
  } catch (error) {
    return null;
  }

  const normalizedPath = path.normalize(decodedPath).replace(/^(\.\.[/\\])+/, '');
  const filePath = path.join(ROOT_DIR, normalizedPath);
  if (!filePath.startsWith(ROOT_DIR)) {
    return null;
  }
  return filePath;
}

function serveStaticFile(requestUrl, response) {
  const filePath = getSafeStaticPath(requestUrl.pathname);
  if (!filePath) {
    sendText(response, 400, 'Invalid path.');
    return;
  }

  fs.stat(filePath, function(statError, stats) {
    if (statError || !stats.isFile()) {
      sendText(response, 404, 'Not found.');
      return;
    }

    const contentType = MIME_TYPES[path.extname(filePath).toLowerCase()] || 'application/octet-stream';
    writeCorsHeaders(response);
    response.writeHead(200, {
      'Content-Type': contentType,
      'Cache-Control': 'no-store'
    });
    fs.createReadStream(filePath).pipe(response);
  });
}

const server = http.createServer(function(request, response) {
  const requestUrl = new URL(request.url, 'http://' + request.headers.host);

  if (request.method === 'OPTIONS') {
    writeCorsHeaders(response);
    response.writeHead(204);
    response.end();
    return;
  }

  if (request.method !== 'GET') {
    sendText(response, 405, 'Method not allowed.');
    return;
  }

  if (requestUrl.pathname === '/ontology-proxy' || requestUrl.pathname === '/api/ontology-proxy') {
    handleOntologyProxyRequest(requestUrl, response, {proxyName: 'local'});
    return;
  }

  serveStaticFile(requestUrl, response);
});

server.listen(PORT, function() {
  console.log('Juma local ontology proxy running at http://localhost:' + PORT);
  console.log('Open http://localhost:' + PORT + '/index.html or keep using index.html from disk.');
});
