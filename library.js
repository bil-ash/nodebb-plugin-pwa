'use strict';

const nconf = require.main.require('nconf');
const winston = require.main.require('winston');

const meta = require.main.require('./src/meta');

const controllers = require('./lib/controllers');

const routeHelpers = require.main.require('./src/routes/helpers');

const plugin = {};

plugin.init = async (params) => {
	const { router /* , middleware , controllers */ } = params;

	
	/*router.get('/service-worker.js', (req, res) => {
		console.warn('overrides core route so we serve our own file,seems to be not working')
		const path = require('path');
		res.status(200)
			.type('application/javascript')
			.set('Service-Worker-Allowed', `${nconf.get('relative_path')}/`)
			.sendFile(path.join(__dirname, 'public/my-service-worker.js'));
	});*/

	/*router.get('/manifest.webmanifest', (req, res) => {
		console.log('overrides core route so we serve our own file')
		const path = require('path');
		res.status(200)
			.type('application/json')
			//.set('Service-Worker-Allowed', `${nconf.get('relative_path')}/`)
			.sendFile(path.join(__dirname, 'public/my-manifest.webmanifest'));
	});*/

	router.get('/.well-know/assetlinks.json', (req, res) => {
		console.log('overrides core route so we serve our own file')
		const path = require('path');
		res.status(200)
			.type('application/json')
			//.set('Service-Worker-Allowed', `${nconf.get('relative_path')}/`)
			.sendFile(path.join(__dirname, 'public/assetlinks.json'));
	})
	
	// Settings saved in the plugin settings can be retrieved via settings methods
	const { setting1, setting2 } = await meta.settings.get('pwa');
	if (setting1) {
		console.log(setting2);
	}

	/**
	 * We create two routes for every view. One API call, and the actual route itself.
	 * Use the `setupPageRoute` helper and NodeBB will take care of everything for you.
	 *
	 * Other helpers include `setupAdminPageRoute` and `setupAPIRoute`
	 * */
	routeHelpers.setupPageRoute(router, '/pwa', [(req, res, next) => {
		winston.info(`[plugins/pwa] In middleware. This argument can be either a single middleware or an array of middlewares`);
		setImmediate(next);
	}], (req, res) => {
		winston.info(`[plugins/pwa] Navigated to ${nconf.get('relative_path')}/pwa`);
		res.render('pwa', { uid: req.uid });
	});

	routeHelpers.setupAdminPageRoute(router, '/admin/plugins/pwa', controllers.renderAdminPage);
};

/**
 * If you wish to add routes to NodeBB's RESTful API, listen to the `static:api.routes` hook.
 * Define your routes similarly to above, and allow core to handle the response via the
 * built-in helpers.formatApiResponse() method.
 *
 * In this example route, the `ensureLoggedIn` middleware is added, which means a valid login
 * session or bearer token (which you can create via ACP > Settings > API Access) needs to be
 * passed in.
 *
 * To call this example route:
 *   curl -X GET \
 * 		http://example.org/api/v3/plugins/pwa/test \
 * 		-H "Authorization: Bearer some_valid_bearer_token"
 *
 * Will yield the following response JSON:
 * 	{
 *		"status": {
 *			"code": "ok",
 *			"message": "OK"
 *		},
 *		"response": {
 *			"foobar": "test"
 *		}
 *	}
 */
plugin.addRoutes = async ({ router, middleware, helpers }) => {
	const middlewares = [
		middleware.ensureLoggedIn,			// use this if you want only registered users to call this route
		// middleware.admin.checkPrivileges,	// use this to restrict the route to administrators
	];

	routeHelpers.setupApiRoute(router, 'get', '/pwa/:param1', middlewares, (req, res) => {
		helpers.formatApiResponse(200, res, {
			foobar: req.params.param1,
		});
	});
};

plugin.addAdminNavigation = (header) => {
	header.plugins.push({
		route: '/plugins/pwa',
		icon: 'fa-tint',
		name: 'PWA',
	});

	return header;
};

module.exports = plugin;
