#  -- Cookies Reuse & MFA Bypass ---


Self-contained Red vs Blue CTF lab. Vulnerable Admin Feedback System with XSS -> session-replay chain and matching Blue Team log telementry.

## Deploy

On a fresh Ubuntu Server 24.04 VM in Proxmox:

```bash
git clone <repo-url> nauli-ctf-lab
cd nauli-ctf-lab
sudo ./provision.sh
```

- Web app: `http://<vm-ip>:3075`
- SSH: `ssh -p 2275 analyst@<vm-ip>` (password: `blue_team_rocks`)
- Logs: `/opt/admin/logs/`

## Red Team Path
1. Recon `robots.txt` -> find `/api/verify-mfa` and `/dashboard`
2. WAF blocks `<script>`; bypass with `<svg onload="fetch(...)">`
3. Payload steals `adm_session` cookie via `window['docu'+'ment']['coo'+'kie']`
4. Replay stolen cookie to `/dashboard` -> MFA skipped -> final flag

## Blue Team Path

SSH in and investigate `/opt/admin/logs/`:
- `access.log` -- atacker `10.10.14.50`, Base64 blob in `X-Forwarded-For`
- `error.log` -- WAF blocks, CRITICAL cookie reuse, bypass anomaly at 18:53:10
- Decode the 44-char Base64 for the Blue Team flag

## Structure

```
app/		Node.js vulnerable web app
nginx/		Reverse proxy on 3075
log-seeder/	Python seeder for Blue Team telementry
provision.sh	Automated VM setup script
```
