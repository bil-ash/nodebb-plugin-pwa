'use strict';

/* globals firebase, importScripts */

importScripts('https://www.gstatic.com/firebasejs/9.0.0/firebase-app.js');
importScripts('https://www.gstatic.com/firebasejs/9.0.0/firebase-messaging.js');

firebase.initializeApp(/* config */);

// Retrieve an instance of Firebase Messaging so that it can handle background
// messages.
// eslint-disable-next-line no-unused-vars
const messaging = firebase.messaging();
