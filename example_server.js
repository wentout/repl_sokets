'use strict';

/**
 * 
 * ONLY FOR DEBUGGING PER SINGLE THREAD!
 * 
 * You must Run this code
 * inside of real debugged server
 * 
 * WARNING!!!
 * 
 * As if it use socket
 * YOU MUST NOT RUN THIS IN Cluster Mode!
 * 
 */

const MY_CONST = 15;

var n = 0;
setInterval(() => {
	n++;
}, 1000);

const getDate = () => {
	return Date.now();
};

const context = {
	myConst : MY_CONST,
	myVar   : n,
	myDate  : getDate,
	_it     : null
};

console.log('The REPL example server is Running!');
console.log('Run: node example_client');

const SOCKET_FILE_PATH = require('path').join(process.cwd(), 'repl.sock');
require('./repl_sockets').server(SOCKET_FILE_PATH, {
	context
}, (replSocket) => {
	context.it = replSocket;
});