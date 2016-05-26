'use strict';

// REPL realization for our debugging model
// https://nodejs.org/api/repl.html
// https://gist.github.com/jakwings/7772580
// https://gist.github.com/TooTallNate/2209310


const path = require('path');
const net  = require('net');

const SOCKET_FILE_PATH = path.join(process.cwd(), 'tmp', 'repl.sock');

const client = function () {
	
	const socket = net.connect(SOCKET_FILE_PATH);
	
	process.stdin.pipe(socket);

	/// For backwards compatibility with Node program older than v0.10,
	/// readable streams switch into "flowing mode" when a 'data' event handler
	/// is added, or when the pause() or resume() methods are called.
	process.stdin.on('data', function(buffer) {
		if (buffer.length === 1 && buffer[0] === 0x04) { // EOT
			process.stdin.emit('end'); // process.stdin will be destroyed
			process.stdin.setRawMode(false);
			process.stdin.pause(); // stop emitting 'data' event
		}
	});

	/// this event won't be fired if REPL is exited by '.exit' command
	process.stdin.on('end', function() {
		console.log('.exit');
		socket.destroy();
	});

	socket.pipe(process.stdout);

	socket.on('connect', function() {
		console.log('Connected.');
		//process.stdin.resume();  // already in flowing mode
		process.stdin.setRawMode(true);
	});

	socket.on('close', function close() {
		console.log('Disconnected.');
		socket.removeListener('close', close);
		process.exit();
	});
	
};

const server = function (opts, cb) {
	const fs   = require('fs');
	const repl = require('repl');
	if (fs.existsSync(SOCKET_FILE_PATH)) {
		fs.unlinkSync(SOCKET_FILE_PATH);
	}
	net.createServer(function(socket) {
		
		const r = repl.start({
			prompt    : process.pid + ' repl > ',
			input     : socket,
			output    : socket,
			terminal  : true,
			useGlobal : false
		});
		
		r.on('exit', function() {
			socket.end();
		});
		
		r.context.repl   = repl;
		r.context._repl  = r;
		r.context.socket = socket;
		
		if (opts.context) {
			Object.keys(opts.context).forEach(function (name) {
				r.context[name] = opts.context[name];
			});
		}
		if (opts.commands) {
			Object.keys(opts.commands).forEach(function (name) {
				try {
					r.defineCommand(name, opts.commands[name]);
				} catch (e) {
					console.log (e.stack || e);
				}
			});
		}
		if (typeof cb == 'function') {
			cb(socket);
		}
		
	}).listen(SOCKET_FILE_PATH);
	
};



module.exports = {
	client : client,
	server : server
};
