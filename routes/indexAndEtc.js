const express = require('express');
const router = express.Router();
const sanitizeHtml = require('sanitize-html');
const secret = require('../lib/secret');
const db = secret.db;

router.get('/', function(req, res) {
  res.render('view', {
		code: 'index',
		user: req.user,
		next: {}
	});
});

router.get('/chat', function(req, res) {
	if (req.query.code) {
		res.render('view', {code: 'privateChat', user: req.user, next: {user: req.user, code: req.query.code}});
	} else {
		res.render('view', {code: 'chat', user: req.user, next: {user: req.user}});
	}
});

router.get('/confirm', function(req, res) {
	const confName = Object.keys(req.query)[0];
	const confVal = sanitizeHtml(req.query[confName]);
	const enToKo = {'userid':'아이디','email':'이메일','nickname':'닉네임'}
	db.query(`SELECT * FROM user WHERE ${confName}=?`, [confVal], function (err, user) {
		if (err) throw err;
		if (user.length === 0) {
			res.json({msg:`<span class="confSuccess" id="${confName}Span">사용 가능한 ${enToKo[confName]}</span>`,conf:true});
		} else {
			res.json({msg:`<span class="confFail" id="${confName}Span">이미 있는 ${enToKo[confName]}</span>`,conf:false});
		}
	});
});

module.exports = router;