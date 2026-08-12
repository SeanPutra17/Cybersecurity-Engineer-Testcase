const express = require('express');
const cookieParser = require('cookie-parser');
const fs = require('fs');
const path = require('path');

const app = express();
const PORT = 3075;
const LOG_DIR = '/opt/admin/logs';

const feedbackStore = [];

//-----middle ware-----

app.use((req, res, next) => {
	res.setHeader('X-Powered-By', 'Node.js');
	next();
});

app.use(express.urlencoded({ extended: true }));
app.use(cookieParser());


app.use((req, res, next) => {
	const hasAnySession = req.cookies.pre_mfa_session ||
		Object.keys(req.cookies).some(k => k.startWith('adm_session'));

	if (!hasAnySession){
		res.cookie('pre_mfa_session', 'pending_mfa_verification', {
			httpOnly: false,
			secure: false,
			sameSite: 'lax'
		});
	}
	next();
});



app.use((req, res, next) => {
	if (req.method === 'POST' && req.body) {
		const bodyStr = JSON.stringify(req.body).toLowerCase();
		if (bodyStr.includes('<script>')) {
			try {
				const line = '${new Date().toISOString()} [WAF] BLOCK <script> from ${req.ip}\n' ;
				fs.appendFileSync(path.join(LOG_DIR, 'error.log'), line);
			} catch (e) {	}
				return res.status(403).send('Forbidden: malicious payload detected.');
			}
		}
		next();
	});


app.get('/robots.txt', (req, res) => {
	res.type('text/plain').send(
		`User-agent: *
		Disallow: /api/verify-mfa
		Disallow: /dashboard`
	);
});


app.get('/', (req, res) => {
	res.send(`<!DOCTYPE html>
		<html lang="en">
		<head>
			<meta charset="utf-8">
			<title> Admin Feedback System</title>
		</head>
		<!--
			>>> Definitely do not open /robots.txt  <<<
		-->

		<body>
			<h1> Admin Feedback System</h1>
			<p>Submit feedback. All feedback will be reviewed by Admin. </p>
			<form action="/feedback" method="POST">
				<textarea name="message" rows="4" cols="60" placeholder="Enter Feedback...."></textarea><br>
				<button type="submit">Submit Feedback</button>
			</form>
			<hr>
			<p><small>Internal system - Admin only.</small></p>
		</body>
		</html>`);
});


app.post('/feedback', (req, res) => {
	const message = (req.body.message || '').toString();
	feedbackStore.push({
		message: message,
		submittedAt: new Date().toISOString(),
		ip: req.ip
	});
	res.send(`<p>Thankyou for your feedback. <a href="/">Back</a></p>`);
});

app.get('/api/verify-mfa', (req, res) => {
	res.send(`<!DOCTYPE html>
		<html>
			<body>
				<h2>MFA Verification</h2>
				<p>Enter one-time code</p>
				<form method="POST" action="/api/verify-mfa">
					<input name="code" placeholder="6-digit code"><br>
					<button>Enter</button>
				</form>
			</body>
		</html>`);
});


app.post('/api/verify-mfa', (req, res) => {
	const code = (req.body.code || '').toString();
	if (code === '123456') {
		const cookieName = 'adm_session_' + Date.now();
		res.cookie(cookieName, 'authenticated_admin', {
			httpOnly: true,
			secure: false,
			sameSite: 'lax'
		});
		return res.redirect('/dashboard');
	}
	res.status(401).send('Invalid MFA code');
});


app.get('/dashboard', (req, res) => {
	const cookieKeys = Object.keys(req.cookies);
	const hasAdminSession = cookieKeys.some(k => k.startWith('adm_session'));

	if (!hasAdminSession){
		return res.status(401).send('Not Authorized. Enter MFA at /api/verify-mfa');
	}

	const feedbackHtml = feedbackStore.map(f =>
		`<div class="xss-payload">${f.message}</div>`
	).join('\n');

	res.send(`<!DOCTYPE html>
			<html>
				<head>
					<title> Admin Dashboard </title>
					<style>
						.xss-payload {border: 1px solid #ccc; padding: 8px; margin: 4px 0;}
					</style>
				</head>

				<body>
					<h1>Admin Dashboard</h1>
					<p>Here's recent feedback list</p>

					<h2>Recent Feedback</h2>
					${feedbackHTML || '<p><em>No feedback yet ....</em></p>'};

					<hr>
					<!-- nothing to see here ! -->
					<!-- SCENARIO75{RED_C00k13_MFA_Byp4ss_0wn3d} -->
					<div style="color: #eee; font-size: 8px">
						Inernal build:SCENARIO75{RED_C00k13_MFA_Byp4ss_0wn3d}
					</div>
				</body>
			</html>`);
	});


app.listen(PORT, '0.0.0.0', () => {
	console.log(`[nauli-lab] Admin Feedback lab listening on 0.0.0.0:${PORT}`);
});
