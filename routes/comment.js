const express = require('express');
const router = express.Router();
const { nanoid } = require('nanoid');
const sanitizeHtml = require('sanitize-html');
const secret = require('../lib/secret');
const db = secret.db;

router.post('/create', function(req, res) {
	if (req.user) {
		db.query('INSERT INTO comments (id, comment, created, author_id, post_id) VALUES (?, ?, NOW(), ?, ?)', [nanoid(10), req.body.comment, req.user[0].nickname, req.body.id], function(err, result) {
			if (err) throw err;
			res.redirect(`/board/article/${req.body.id}`);
		});
	} else {
		res.send(`
		<script>
			alert('로그인을 해주세요.');
			location.href = '/board/article/${req.body.id}';
		</script>
		`);
	}
});

router.get('/update/:id', function(req, res) {
	db.query('SELECT * FROM comments WHERE id=?', [req.params.id], function(err, post) {
		if (err) throw err;
		if (req.user) {
			if(req.user[0].nickname === post[0].author_id) {
				post[0].comment = sanitizeHtml(post[0].comment.replace(/(<br>|<br\/>|<br \/>)/g, '\r\n'));
				res.render('view', {code: 'cmtUpdate', user: req.user, next: {post: post[0], id: req.params.id}});
			} else {
				res.send(`
				<script>
					alert('작성자만 변경할 수 있습니다.');
					location.href = '/board/article/${post[0].post_id}';
				</script>
				`);
			}
		} else {
			res.send(`
			<script>
				alert('로그인을 해주세요.');
				location.href = '/board/article/${post[0].post_id}';
			</script>
			`);
		}
	});
});

router.post('/update/callback', function(req, res) {
	db.query('SELECT * FROM comments WHERE id=?', [req.body.id], function(err, post) {
		if (err) throw err;
		if (req.user) {
			if(req.user[0].nickname === post[0].author_id) {
				const comment = req.body.comment.replace(/(?:\r\n|\r|\n)/g, '<br />');
				db.query('UPDATE comments SET comment=? WHERE id=?', [comment, req.body.id], function(err, result) {
					if (err) throw err;
					res.redirect(`/board/article/${post[0].post_id}`);
				});
			} else {
				res.send(`
				<script>
					alert('작성자만 변경할 수 있습니다.');
					location.href = '/board/article/${post[0].post_id}';
				</script>
				`);
			}
		} else {
			res.send(`
			<script>
				alert('로그인을 해주세요.');
				location.href = '/board/article/${post[0].post_id}';
			</script>
			`);
		}
	});
});
router.post('/delete', function(req, res) {
	db.query('SELECT * from comments WHERE id=?', [req.body.id], function(err, post) {
		if (err) throw err;
		if (req.user) {
			if(req.user[0].nickname === post[0].author_id) {
				db.query('DELETE FROM comments WHERE id=?', [req.body.id], function(err2, result) {
					if (err2) throw err2;
					res.redirect(`/board/article/${post[0].post_id}`);
				});
			} else {
				res.send(`
				<script>
					alert('작성자만 변경할 수 있습니다.');
					location.href = '/board/article/${post[0].post_id}';
				</script>
				`);
			}
		} else {
			res.send(`
			<script>
				alert('로그인을 해주세요.');
				location.href = '/board/article/${post[0].post_id}';
			</script>
			`);
		}
	});
});

module.exports = router;