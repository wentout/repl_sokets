'use strict';

// REPL realization for our debugging model
// https://nodejs.org/api/repl.html
// https://gist.github.com/jakwings/7772580
// https://gist.github.com/TooTallNate/2209310

const net = require('net');

const client = (SOCKET_FILE_PATH) => {

	const socket = net.connect(SOCKET_FILE_PATH);

	process.stdin.pipe(socket);

	/// this event won't be fired if REPL is exited by '.exit' command
	process.stdin.on('end', () => {
		process._rawDebug('.exit');
		socket.destroy();
	});

	socket.pipe(process.stdout);

	socket.on('connect', () => {
		process._rawDebug('Connected.');
		//process.stdin.resume();  // already in flowing mode
		process.stdin.setRawMode(true);
	});
	const close = () => {
		process._rawDebug('Disconnected.');
		socket.removeListener('close', close);
		process.exit(0);
	};
	socket.on('close', close);

};

const server = function (SOCKET_FILE_PATH, opts, cb) {
	const fs = require('fs');
	const repl = require('repl');
	if (fs.existsSync(SOCKET_FILE_PATH)) {
		fs.unlinkSync(SOCKET_FILE_PATH);
	}
	const historyPath = opts.historyPath;

	const replServer = net.createServer((socket) => {

		const r = repl.start({
			prompt: process.pid + ' repl > ',
			input: socket,
			output: socket,
			terminal: !opts.terminal,
			useGlobal: !!opts.useGlobal
		});

		r.trueConsoleLog = null;

		r.log = function () {
			const args = Array.prototype.slice.call(arguments);
			socket.write.call(socket, '\n');
			args.forEach((arg) => {
				socket.write.call(socket, arg);
			});
		};

		const consoleInit = () => {
			const consoleLog = process._rawDebug;
			r.trueConsoleLog = consoleLog;
			process._rawDebug = r.log;
		};

		if (historyPath) {

			let fd = fs.openSync(historyPath, 'a');

			// we use var here to rid of blok scoping limits
			var saveHistory = (code, toCloseFd, clear) => {
				// !!! if we will use >>>
				// r.commands.save.action.call(r, historyPath);
				// <<< repl will notify us
				// so we will not use this
				if (code) {
					// DEP0013 rid
					fs.writeSync(fd, code + '\n', () => { });
				}
				if (toCloseFd || clear) {
					try {
						fs.closeSync(fd);
						// eslint-disable-next-line
					} catch (err) { }
				}
				if (clear) {
					fs.unlinkSync(historyPath);
					fd = fs.openSync(historyPath, 'a');
				}
			};

			try {
				fs.accessSync(historyPath);
				// !!! if we will use >>>
				// r.commands.load.action.call(r, historyPath);
				// <<< repl will execute each line
				// but we don't need this
				// therefore we will use some code from
				// https://github.com/tmpvar/repl.history/blob/master/index.js
				const lines = fs.readFileSync(historyPath, 'utf-8').split('\n').reverse();
				// r.lines = lines;
				r.rli.history = lines;
				r.rli.history.shift();
				// will be incremented before pop
				r.rli.historyIndex = -1;
				// eslint-disable-next-line
			} catch (accessError) { }

			const saveHistoryAndClose = saveHistory.bind(null, null, true, false);

			process
				.on('SIGTERM', saveHistoryAndClose)
				.on('SIGINT', saveHistoryAndClose)
				.on('exit', saveHistoryAndClose);

			r.rli.addListener('line', (line) => {
				if (line !== '.hclear') {
					saveHistory(line);
				}
			});

			r.defineCommand('hclear', {
				help: 'to get rid of history',
				action: () => {
					r.rli.history = [];
					r.rli.historyIndex = -1;
					saveHistory(null, true, true);
					r.displayPrompt();
				}
			});
		}

		const checkAndInitConsole = () => {
			if (!r.trueConsoleLog) {
				consoleInit();
			}
		};

		socket.on('data', checkAndInitConsole);
		r.rli.addListener('line', checkAndInitConsole);

		r.on('exit', () => {
			if (typeof saveHistory == 'function') {
				saveHistory(null, true);
			}
			if (r.trueConsoleLog) {
				process._rawDebug = r.trueConsoleLog;
				r.trueConsoleLog = null;
			}
			socket.end();
		});

		if (opts.context) {
			Object.keys(opts.context).forEach((name) => {
				r.context[name] = opts.context[name];
			});
		}

		if (opts.commands) {
			Object.keys(opts.commands).forEach((name) => {
				try {
					r.defineCommand(name, opts.commands[name]);
				} catch (error) {
					process._rawDebug(error.stack || error);
				}
			});
		}

		if (typeof cb == 'function') {
			cb(socket, r);
		}

	});
	
	replServer.listen(SOCKET_FILE_PATH);

};

module.exports = {
	client: client,
	server: server
};
