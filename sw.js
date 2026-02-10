// Main Service Worker file
// This is the entry point for service worker registration

const SW_VERSION = '1.0.0';

// Import the actual service worker code
importScripts('/assets/js/service-worker.js');

// Log installation
self.addEventListener('install', event => {
    console.log(`Service Worker v${SW_VERSION} installing...`);
});

self.addEventListener('activate', event => {
    console.log(`Service Worker v${SW_VERSION} activated`);
});

// Handle messages for updates
self.addEventListener('message', event => {
    if (event.data && event.data.type === 'GET_VERSION') {
        event.ports[0].postMessage(SW_VERSION);
    }
});