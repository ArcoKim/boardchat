const express = require('express');
const router = express.Router();
const { nanoid } = require('nanoid');
const passport = require('passport')
, LocalStrategy = require('passport-local').Strategy
, FacebookStrategy = require('passport-facebook').Strategy
, GoogleStrategy = require('passport-google-oauth').OAuth2Strategy;
const bcrypt = require('bcryptjs');
const saltRounds = 10;
const secret = require('../lib/secret');
const db = secret.db;

passport.use(new LocalStrategy({
	usernameField: 'id',
	passwordField: 'pw'
},
function(username, password, done) {
	db.query('SELECT * FROM user WHERE userid=?', [username], function (err, user) {
		if (err) return done(err);
		if (user.length == 0) {
			return done(null, false, { message: '아이디가 맞지 않습니다.' });
		}
		bcrypt.compare(password, user[0].password, function(errhash, result) {
			if (errhash) throw errhash;
			if (!result) {
				return done(null, false, { message: '비밀번호가 맞지 않습니다.' });
			}
			return done(null, user);
		});
	});
}
));
secret.facebook.profileFields = ['id', 'emails', 'name', 'displayName'];
passport.use(new FacebookStrategy(secret.facebook, 
function(accessToken, refreshToken, profile, done) {
	db.query('SELECT * FROM user WHERE email=?', [profile.emails[0].value], function (err, bUser) {
		if (err) return done(err);
		if (bUser.length == 0) {
			const id = nanoid(10);
			db.query('INSERT INTO user (id, email, nickname, facebookid) VALUES (?, ?, ?, ?)', [id, profile.emails[0].value, profile.displayName, profile.id], function(err2, result) {
				if (err2) return done(err2);
				db.query('SELECT * FROM user WHERE id=?', [id], function(err3, user) {
					done(err3, user);
				});
			});
		} else {
			if (bUser[0].facebookid === null) {
				db.query('UPDATE user SET facebookid=? WHERE id=?', [profile.id, bUser[0].id], function(err2, result) {
					if (err2) return done(err2);
					db.query('SELECT * FROM user WHERE id=?', [bUser[0].id], function(err3, user) {
						done(err3, user);
					});
				});
			} else {
				done(null, bUser);
			}
		}
	});
}
));
passport.use(new GoogleStrategy(secret.google,
function(accessToken, refreshToken, profile, done) {
	db.query('SELECT * FROM user WHERE email=?', [profile.emails[0].value], function (err, bUser) {
		if (err) return done(err);
		if (bUser.length == 0) {
			const id = nanoid(10);
			db.query('INSERT INTO user (id, email, nickname, googleid) VALUES (?, ?, ?, ?)', [id, profile.emails[0].value, profile.displayName, profile.id], function(err2, result) {
				if (err2) return done(err2);
				db.query('SELECT * FROM user WHERE id=?', [id], function(err3, user) {
					done(err3, user);
				});
			});
		} else {
			if (bUser[0].googleid === null) {
				db.query('UPDATE user SET googleid=? WHERE id=?', [profile.id, bUser[0].id], function(err2, result) {
					if (err2) return done(err2);
					db.query('SELECT * FROM user WHERE id=?', [bUser[0].id], function(err3, user) {
						done(err3, user);
					});
				});
			} else {
				done(null, bUser);
			}
		}
	});
}
));

router.get('/login', function(req, res) {
	let errorMsg = req.flash('error')[0];
	if (!errorMsg) {
		errorMsg = '';
	}
	res.render('view', {code: 'login', user: req.user, next: {error: errorMsg}});
});

router.post('/login/local',
  passport.authenticate('local', { 
		successRedirect: '/',
    failureRedirect: '/info/login',
		failureFlash: true
	})
);

router.get('/login/facebook', 
	passport.authenticate('facebook', { 
		scope: 'email', 
		authType: 'reauthenticate'
	})
);

router.get('/login/facebook/callback',
  passport.authenticate('facebook', {
		successRedirect: '/',
    failureRedirect: '/info/login' 
	})
);

router.get('/login/google',
  passport.authenticate('google', { 
		scope: ['https://www.googleapis.com/auth/plus.login', 'email'],
		prompt : "select_account"
	})
);

router.get('/login/google/callback', 
  passport.authenticate('google', { 
		failureRedirect: '/info/login' 
	}),
  function(req, res) {
    res.redirect('/');
  }
);

router.get('/logout', function(req, res){
  req.logout();
  res.redirect('/');
});

router.get('/register', function(req, res) {
	let flashMsg = req.flash('user')[0];
	let errorMsg = req.flash('error')[0];
	if (!flashMsg) {
		flashMsg = {id:'', email:'', pw:'', pw2:'', nickname:''};
	}
	if (!errorMsg) {
		errorMsg = '';
	}
	res.render('view', {code: 'register', user: req.user, next: {flash: flashMsg, error: errorMsg}});
});

router.post('/register/callback', function(req, res) {
	const post = req.body;
	const id = nanoid(10);
	if(post.pw !== post.pw2) {
		req.flash('user', {
			id: post.id,
			email: post.email,
			pw: post.pw,
			pw2: post.pw2,
			nickname: post.nickname
		});
		req.flash('error', '비밀번호가 같지 않습니다.');
		res.redirect('/info/register');
		return;
	}
	bcrypt.hash(post.pw, saltRounds, function(errhash, hash) {
		if (errhash) throw errhash;
		db.query('INSERT INTO user (id, userid, email, nickname, password) VALUES (?, ?, ?, ?, ?)', [id, post.id, post.email, post.nickname, hash], function(err2, result) {
			if (err2) throw err2;
			db.query('SELECT * FROM user WHERE id=?', [id], function(err3, user) {
				if (err3) throw err3;
				req.login(user, function(err4) {
					if (err4) return next(err4);
					return res.redirect('/');
				});
			});
		});
	});
});

module.exports = router;