'use strict';

const {
  handleOntologyProxyRequest,
  sendText,
  writeCorsHeaders
} = require('../ontology-proxy-core');

module.exports = async function ontologyProxy(request, response) {
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

  const protocol = request.headers['x-forwarded-proto'] || 'https';
  const host = request.headers.host || 'localhost';
  const requestUrl = new URL(request.url, protocol + '://' + host);
  await handleOntologyProxyRequest(requestUrl, response, {proxyName: 'vercel'});
};
