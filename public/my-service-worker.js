'use strict';

const CACHE='nbbcache';
const precacheFiles=[];
//const offlineFallbackPage = "ToDo-replace-this-name.html"; won't require but lets keep

const networkFirstPaths = [/\/api\/.*/
  // old:  /\/api\/v3\/chats.*/,/\/api\/chats\/.*/,/\/api\/user\/.*/
  // Example: /\/api\/.*/
];

const avoidCachingPaths = [/\/socket.io\/.*/,/\/assets\/uploads\/files\/.*/
  /* Add an array of regex of paths that shouldn't be cached */
  // Example: /\/api\/.*/
];

function pathComparer(requestUrl, pathRegEx) {
  return requestUrl.match(new RegExp(pathRegEx));
}

function comparePaths(requestUrl, pathsArray) {
  if (requestUrl) {
    for (let index = 0; index < pathsArray.length; index++) {
      const pathRegEx = pathsArray[index];
      if (pathComparer(requestUrl, pathRegEx)) {
        return true;
      }
    }
  }

  return false;
}

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

	if (fetchEvent.request.method !== "GET") return;
/*
  if (comparePaths(fetchEvent.request.url, networkFirstPaths)) {
    networkFirstFetch(fetchEvent);
  } else {
    cacheFirstFetch(fetchEvent);
  }
*/
fetchEvent.respondWith(caches.match(fetchEvent.request).then(function (response) {
  if (!response) {
    return fetch(fetchEvent.request);
  }

  return response;
}));
	
});

self.addEventListener('push', (event) => {
	// Keep the service worker alive until the notification is created.
	const { title, body, tag, data } = event.data.json();

	if (title && body) {
		const { icon } = data;
		delete data.icon;
		const { badge } = data;
		delete data.badge;

		event.waitUntil(
			self.registration.showNotification(title, { body, tag, data, icon, badge })
		);
	} else if (tag) {
		event.waitUntil(
			self.registration.getNotifications({ tag }).then((notifications) => {
				notifications.forEach((notification) => {
					notification.close();
				});
			})
		);
	}
});

self.addEventListener('notificationclick', (event) => {
	event.notification.close();
	let target;
	if (event.notification.data && event.notification.data.url) {
		target = new URL(event.notification.data.url);
	}

	// This looks to see if the current is already open and focuses if it is
	event.waitUntil(
		self.clients
			.matchAll({ type: 'window' })
			.then((clientList) => {
				// eslint-disable-next-line no-restricted-syntax
				for (const client of clientList) {
					const { hostname } = new URL(client.url);
					if (target && hostname === target.hostname && 'focus' in client) {
						client.postMessage({
							action: 'ajaxify',
							url: target.pathname,
						});
						return client.focus();
					}
				}
				if (self.clients.openWindow) return self.clients.openWindow(target.pathname);
			})
	);
});


function cacheFirstFetch(event) {
  event.respondWith(
    fromCache(event.request).then(
      function (response) {
        // The response was found in the cache so we responde with it and update the entry

        // This is where we call the server to get the newest version of the
        // file to use the next time we show view
        event.waitUntil(
          fetch(event.request).then(function (response) {
            return updateCache(event.request, response);
          })
        );

        return response;
      },
      function () {
        // The response was not found in the cache so we look for it on the server
        return fetch(event.request)
          .then(function (response) {
            // If request was success, add or update it in the cache
            event.waitUntil(updateCache(event.request, response.clone()));

            return response;
          })
          .catch(function (error) {
            // The following validates that the request was for a navigation to a new document
            if (event.request.destination !== "document" || event.request.mode !== "navigate") {
              return;
            }

            console.log("[PWA Builder] Network request failed and no cache." + error);
            // Use the precached offline page as fallback
            return caches.open(CACHE).then(function (cache) {
              cache.match(offlineFallbackPage);
            });
          });
      }
    )
  );
}


function networkFirstFetch(event) {
  event.respondWith(
    fetch(event.request)
      .then(function (response) {
        // If request was success, add or update it in the cache
        event.waitUntil(updateCache(event.request, response.clone()));
        return response;
      })
      .catch(function (error) {
        console.log("[PWA Builder] Network request Failed. Serving content from cache: " + error);
        return fromCache(event.request);
      })
  );
}

function fromCache(request) {
  // Check to see if you have it in the cache
  // Return response
  // If not in the cache, then return
  return caches.open(CACHE).then(function (cache) {
    return cache.match(request).then(function (matching) {
      if (!matching || matching.status === 404) {
        return Promise.reject("no-match");
      }

      return matching;
    });
  });
}

function updateCache(request, response) {
  if (!comparePaths(request.url, avoidCachingPaths)) {
    return caches.open(CACHE).then(function (cache) {
      return cache.put(request, response);
    });
  }

  return Promise.resolve();
}