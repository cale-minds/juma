'use strict';

const http = require('http');
const https = require('https');

const ACCEPT_HEADER = 'text/turtle, application/rdf+xml, application/ld+json, application/n-triples, text/plain, */*';
const REQUEST_TIMEOUT_MS = 30000;
const MAX_REDIRECTS = 5;
const MAX_RESPONSE_BYTES = 25 * 1024 * 1024;

function writeCorsHeaders(response) {
  response.setHeader('Access-Control-Allow-Origin', '*');
  response.setHeader('Access-Control-Allow-Methods', 'GET, OPTIONS');
  response.setHeader('Access-Control-Allow-Headers', 'Accept, Content-Type');
  response.setHeader('Vary', 'Origin');
}

function sendText(response, status, message) {
  writeCorsHeaders(response);
  response.writeHead(status, {'Content-Type': 'text/plain; charset=utf-8'});
  response.end(message);
}

function isBlockedHost(hostname) {
  const host = String(hostname || '').toLowerCase();
  return host === 'localhost' ||
    host === '127.0.0.1' ||
    host === '0.0.0.0' ||
    host === '::1' ||
    host.startsWith('10.') ||
    host.startsWith('192.168.') ||
    /^172\.(1[6-9]|2\d|3[0-1])\./.test(host);
}

function fetchRemoteOntology(ontologyUrl, redirectsLeft) {
  const remainingRedirects = typeof redirectsLeft === 'number' ? redirectsLeft : MAX_REDIRECTS;
  const client = ontologyUrl.protocol === 'https:' ? https : http;

  return new Promise(function(resolve, reject) {
    const request = client.request(ontologyUrl, {
      headers: {
        Accept: ACCEPT_HEADER,
        'User-Agent': 'Juma-Ontology-Importer/2.0'
      },
      method: 'GET',
      timeout: REQUEST_TIMEOUT_MS
    }, function(upstream) {
      const statusCode = upstream.statusCode || 0;
      const location = upstream.headers.location;

      if (statusCode >= 300 && statusCode < 400 && location && remainingRedirects > 0) {
        upstream.resume();
        try {
          const nextUrl = new URL(location, ontologyUrl);
          if ((nextUrl.protocol !== 'http:' && nextUrl.protocol !== 'https:') || isBlockedHost(nextUrl.hostname)) {
            reject(new Error('Redirect target is not allowed.'));
            return;
          }
          resolve(fetchRemoteOntology(nextUrl, remainingRedirects - 1));
        } catch (error) {
          reject(error);
        }
        return;
      }

      const chunks = [];
      let totalBytes = 0;
      let finished = false;

      upstream.on('data', function(chunk) {
        if (finished) {
          return;
        }
        totalBytes += chunk.length;
        if (totalBytes > MAX_RESPONSE_BYTES) {
          finished = true;
          request.destroy(new Error('Ontology response is too large.'));
          return;
        }
        chunks.push(chunk);
      });

      upstream.on('end', function() {
        if (finished) {
          return;
        }
        finished = true;
        resolve({
          body: Buffer.concat(chunks),
          headers: upstream.headers,
          ok: statusCode >= 200 && statusCode < 300,
          status: statusCode
        });
      });
    });

    request.on('timeout', function() {
      request.destroy(new Error('Ontology request timed out.'));
    });

    request.on('error', reject);
    request.end();
  });
}

async function handleOntologyProxyRequest(requestUrl, response, options) {
  const target = requestUrl.searchParams.get('url');
  const proxyName = options && options.proxyName ? options.proxyName : 'juma';

  if (!target) {
    sendText(response, 400, 'Missing ontology URL.');
    return;
  }

  let ontologyUrl;
  try {
    ontologyUrl = new URL(target);
  } catch (error) {
    sendText(response, 400, 'Invalid ontology URL.');
    return;
  }

  if (ontologyUrl.protocol !== 'http:' && ontologyUrl.protocol !== 'https:') {
    sendText(response, 400, 'Only HTTP and HTTPS ontology URLs are supported.');
    return;
  }

  if (isBlockedHost(ontologyUrl.hostname)) {
    sendText(response, 400, 'Local and private network URLs are not allowed.');
    return;
  }

  try {
    const upstream = await fetchRemoteOntology(ontologyUrl);

    if (!upstream.ok) {
      sendText(response, upstream.status, 'Upstream ontology request failed with status ' + upstream.status + '.');
      return;
    }

    const contentType = upstream.headers['content-type'] || 'text/plain; charset=utf-8';
    writeCorsHeaders(response);
    response.writeHead(200, {
      'Content-Type': contentType,
      'Cache-Control': 'no-store',
      'X-Juma-Ontology-Proxy': proxyName
    });
    response.end(upstream.body);
  } catch (error) {
    const timedOut = error && /timed out/i.test(error.message || '');
    sendText(response, timedOut ? 504 : 502, timedOut ? 'Ontology request timed out.' : 'Ontology request failed.');
    console.warn('Ontology proxy request failed:', error);
  }
}

module.exports = {
  handleOntologyProxyRequest,
  sendText,
  writeCorsHeaders
};
