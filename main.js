const express = require('express');
const app = express();
const http = require('http');
const server = http.createServer(app);
const { Server } = require("socket.io");
const io = new Server(server);
const path = require('path');
const secret = require('./lib/secret');
const db = secret.db;
const session = require('express-session');
const MySQLStore = require('express-mysql-session')(session);
const sanitizeHtml = require('sanitize-html');
const flash = require('connect-flash');
const helmet = require('helmet');

app.set('view engine', 'ejs');
app.set('views', './views');
const sessionStore = new MySQLStore(secret.mysql);
app.use(express.static(path.join(__dirname, 'public')));
app.use('/board', express.static(path.join(__dirname, 'public')));
app.use(express.json());
app.use(express.urlencoded({extended: true}));
app.use(session({
  secret: secret.session,
  resave: false,
  saveUninitialized: false,
	store: sessionStore
}));
app.use(flash());
app.use(helmet({
	contentSecurityPolicy: false
}));

const passport = require('passport');
app.use(passport.initialize());
app.use(passport.session());
passport.serializeUser(function(user, done) {
	done(null, user[0].id);
});
passport.deserializeUser(function(id, done) {
	db.query('SELECT * FROM user WHERE id=?', [id], function (err, user) {
		done(err, user);
	});
});

io.on('connection', (socket) => {
	socket.on('sendS', (msg) => {
    io.emit('sendC', [msg[0], sanitizeHtml(msg[1])]);
  });
	socket.on('sendSR', (msg) => {
    io.to(msg[2]).emit('sendCR', [msg[0], sanitizeHtml(msg[1])]);
  });
	socket.on('createJoin', (room) => {
		socket.join(room);
	});
});

const indexAndEtc = require('./routes/indexAndEtc');
const boardRouter = require('./routes/board');
const infoRouter = require('./routes/info');
const commentRouter = require('./routes/comment');
const mypageRouter = require('./routes/mypage');
app.use('/', indexAndEtc);
app.use('/board', boardRouter);
app.use('/info', infoRouter);
app.use('/comment', commentRouter);
app.use('/mypage', mypageRouter);

app.use(function(req, res, next) {
  res.status(404).send('<h1>Not Found</h1>');
});

app.use(function (err, req, res, next) {
  console.error(err.stack);
  res.status(500).send('Something broke!');
});

server.listen(process.env.PORT || 3000, () => {
  console.log('Example app listening at port 3000');
});