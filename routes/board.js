const express = require('express');
const router = express.Router();
const sanitizeHtml = require('sanitize-html');
const secret = require('../lib/secret');
const db = secret.db;

router.get('/:id', function(req, res) {
	db.query('SELECT * FROM boardlist WHERE id=?', [req.params.id], function(err, board) {
		if (err) throw err;
		let limit = 0;
		if (req.query.page) {
			let pageNum = Number(req.query.page);
			if (!isNaN(pageNum) && pageNum != 1) {
				limit = ( pageNum - 1) * 15;
			}
		}
		db.query('SELECT * FROM boardpost WHERE board_id=? ORDER BY id DESC LIMIT ?,15', [req.params.id, limit], function(err2, posts) {
			if (err2) throw err2;
			let i = 0;
			for(i = 0; i < posts.length; i++) {
				posts[i].title = sanitizeHtml(posts[i].title);
				posts[i].author_id = sanitizeHtml(posts[i].author_id);
			}
			db.query('SELECT COUNT(*) AS len FROM boardpost WHERE board_id=?', [req.params.id], function(err3, postLen) {
				if (err3) throw err3;
				i = 1;
				if (req.query.page) {
					let pageDiv = Number(req.query.page);
					if (!isNaN(pageDiv)) {
						pageDiv /= 10;
						if (pageDiv <= 1) {
							i = Math.ceil(pageDiv);
						} else {
							i = Math.floor(pageDiv) * 10 + 1;
						}
					}
				}
				res.render('view', {code: 'post', user: req.user, next: {posts: posts, board: board[0], id: req.params.id, len: postLen[0].len, nIncI: i}});
			});
		});
	});
});

router.get('/article/:id', function(req, res) {
	db.query('SELECT * FROM boardpost WHERE id=?', [req.params.id], function(err, post) {
		if (err) throw err;
		post[0].title = sanitizeHtml(post[0].title);
		post[0].article = sanitizeHtml(post[0].article);
		post[0].author_id = sanitizeHtml(post[0].author_id);
		db.query('SELECT * FROM comments WHERE post_id=?', [req.params.id], function(err2, comments) {
			if (err2) throw err3;
			res.render('view', {code: 'article', user: req.user, next: {post: post[0], id: req.params.id, comments: comments}});
		});
	});
});

router.get('/create/:id', function(req, res) {
	if(req.user) {
		res.render('view', {code: 'create', user: req.user, next: {boardId: req.params.id, author: req.user[0].nickname}});
	} else {
		res.send(`
		<script>
			alert('로그인을 해주세요.');
			location.href = '/board/${req.params.id}';
		</script>
		`);
	}
});

router.post('/create/callback', function(req, res) {
	if(req.user) {
		const article = req.body.article.replace(/(?:\r\n|\r|\n)/g, '<br />');
		db.query('INSERT INTO boardpost (title, article, created, author_id, board_id) VALUES (?, ?, NOW(), ?, ?)', [req.body.title, article, req.body.author, req.body.boardId], function(err, result) {
			if (err) throw err;
			res.redirect(`/board/article/${result.insertId}`);
		});
	} else {
		res.send(`
		<script>
			alert('로그인을 해주세요.');
			location.href = '/board/${req.body.boardId}';
		</script>
		`);
	}
});

router.get('/update/:id', function(req, res) {
	db.query('SELECT * FROM boardpost WHERE id=?', [req.params.id], function(err, post) {
		if (err) throw err;
		if (req.user) {
			if(req.user[0].nickname === post[0].author_id) {
				post[0].title = sanitizeHtml(post[0].title);
				post[0].article = sanitizeHtml(post[0].article.replace(/(<br>|<br\/>|<br \/>)/g, '\r\n'));
				res.render('view', {code: 'update', user: req.user, next: {post: post, id: req.params.id}});
			} else {
				res.send(`
				<script>
					alert('작성자만 변경할 수 있습니다.');
					location.href = '/board/article/${req.params.id}';
				</script>
				`);
			}
		} else {
			res.send(`
			<script>
				alert('로그인을 해주세요.');
				location.href = '/board/article/${req.params.id}';
			</script>
			`);
		}
	});
});

router.post('/update/callback', function(req, res) {
	db.query('SELECT * FROM boardpost WHERE id=?', [req.body.id], function(err, post) {
		if (err) throw err;
		if (req.user) {
			if(req.user[0].nickname === post[0].author_id) {
				const article = req.body.article.replace(/(?:\r\n|\r|\n)/g, '<br />');
				db.query('UPDATE boardpost SET title=?, article=? WHERE id=?', [req.body.title, article, req.body.id], function(err, result) {
					if (err) throw err;
					res.redirect(`/board/article/${req.body.id}`);
				});
			} else {
				res.send(`
				<script>
					alert('작성자만 변경할 수 있습니다.');
					location.href = '/board/article/${req.body.id}';
				</script>
				`);
			}
		} else {
			res.send(`
			<script>
				alert('로그인을 해주세요.');
				location.href = '/board/article/${req.body.id}';
			</script>
			`);
		}
	});
});

router.post('/delete', function(req, res) {
	db.query('SELECT * from boardpost WHERE id=?', [req.body.id], function(err, post) {
		if (err) throw err;
		if (req.user) {
			if(req.user[0].nickname === post[0].author_id) {
				db.query('DELETE boardpost, comments FROM boardpost INNER JOIN comments ON boardpost.id = comments.post_id WHERE boardpost.id=?', [req.body.id], function(err2, result) {
					if (err2) throw err2;
					res.redirect(`/board/${post[0].board_id}`);
				});
			} else {
				res.send(`
				<script>
					alert('작성자만 변경할 수 있습니다.');
					location.href = '/board/article/${req.body.id}';
				</script>
				`);
			}
		} else {
			res.send(`
			<script>
				alert('로그인을 해주세요.');
				location.href = '/board/article/${req.body.id}';
			</script>
			`);
		}
	});
});

module.exports = router;