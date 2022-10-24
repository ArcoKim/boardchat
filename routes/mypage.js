const express = require('express');
const router = express.Router();
const secret = require('../lib/secret');
const db = secret.db;
const bcrypt = require('bcryptjs');
const saltRounds = 10;

router.get('/', function(req, res) {
	const errorOne = req.flash('error')[0];
	const errorTwo = req.flash('error2')[0];
	if (req.user) {
		res.render('view', {code: 'manage', user: req.user, next: {user: req.user, error: errorOne, error2: errorTwo}});
	} else {
		res.send(`
		<script>
			alert('로그인을 해주세요.');
			location.href = '/';
		</script>
		`);
	}
});

router.post('/change', function(req, res) {
	const post = req.body;
	if(post.pw !== post.pw2) {
		req.flash('error', '비밀번호가 같지 않습니다.');
		res.redirect('/mypage');
		return;
	}
	db.query('SELECT * FROM user WHERE id=?', [post.dbid], function(err1, reg) {
		if (reg.length > 0) {
			bcrypt.hash(post.pw, saltRounds, function(errhash, hash) {
				if (errhash) throw errhash;
				db.query('UPDATE user SET userid=?, nickname=?, password=?, email=? WHERE id=?', [post.id, post.nickname, hash, post.email, post.dbid], function(err2, result) {
					if (err2) throw err2;
					req.logout();
					db.query('SELECT * FROM user WHERE id=?', [post.dbid], function(err3, user) {
						if (err3) throw err3;
						req.login(user, function(err4) {
							if (err4) return next(err4);
							return res.redirect('/');
						});
					});
				});
			});
		} else {
			req.flash('error', '재로그인을 해주세요.');
			res.redirect('/mypage');
			return;
		}
	});
});

router.post('/out', function(req, res) {
	const post = req.body;
	const user = req.user;
	if (user[0].userid === post.id) {
		bcrypt.compare(post.pw, user[0].password, function(errhash, result) {
			if (errhash) throw errhash;
			if (result) {
				req.logout();
				db.query('DELETE FROM user WHERE id=?', [user[0].id], function(err, result) {
					if (err) throw err;
					res.redirect('/');
				});
			} else {
				req.flash('error2','회원정보가 맞지 않습니다.');
				res.redirect('/mypage');
			}
		});
	} else {
		req.flash('error2', '회원정보가 맞지 않습니다.');
		res.redirect('/mypage');
	}
});

module.exports = router;