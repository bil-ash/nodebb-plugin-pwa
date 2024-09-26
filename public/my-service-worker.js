'use strict';

self.addEventListener('install', () => {
	// Register self as the primary service worker
	self.skipWaiting();
});

self.addEventListener('activate', (event) => {
	// Take responsibility over existing clients from old service worker
	event.waitUntil(self.clients.claim());
});

self.addEventListener('fetch', function (fetchEvent) {
	// This is the code that ignores post requests
	// https://github.com/NodeBB/NodeBB/issues/9151
	// https://github.com/w3c/ServiceWorker/issues/1141
	// https://stackoverflow.com/questions/54448367/ajax-xmlhttprequest-progress-monitoring-doesnt-work-with-service-workers
	/*if (event.request.method === 'POST') {
		return;
	}

	event.respondWith(caches.match(event.request).then(function (response) {
		if (!response) {
			return fetch(event.request);
		}

		return response;
	}));*/

	if (fetchEvent.request.url.endsWith('/receive-files/') && fetchEvent.request.method === 'POST') {
    return fetchEvent.respondWith(
      (async () => {
        const formData = await fetchEvent.request.formData();
        const image = formData.get('image');
        const keys = await caches.keys();
        const mediaCache = await caches.open(keys.filter((key) => key.startsWith('media'))[0]);
        await mediaCache.put('shared-image', new Response(image));
        return Response.redirect('./compose?cid=2&share-target=1', 303);
      })(),
    );
		
  }
	else if (fetchEvent.request.method==='GET'){
		return fetch(fetchEvent.request);
	}

	
});
