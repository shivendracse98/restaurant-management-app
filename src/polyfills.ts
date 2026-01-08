/**
 * Polyfill for 'global' which is needed by sockjs-client and some other libraries
 * that expect a Node.js-like environment.
 */
(window as any).global = window;
