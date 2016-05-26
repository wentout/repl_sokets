'use strict';

const SOCKET_FILE_PATH = require('path').join(process.cwd(), 'repl.sock');
require('./repl_sockets').client(SOCKET_FILE_PATH);


