set -euo pipefail

echo "[+] Nauli CTF lab starting..."

# --- Check run as root ---
if [ "$EUID" -ne 0 ]; then
	echo "[!] Please run as root: sudo ./provision.sh"
	exit 1
fi

# --- Update system + install prerequisites ---
echo "[+] Updating apt and installing prerequisites...."
apt-get update -y
apt-get install -y ca-certificates curl gnupg git

# --- Install Docker ----
if ! command -v docker >/dev/null 2>&1; then
	echo "[+] Installing Docker...."
	install -m 0755 -d /etc/apt/keyrings
	curl -fsSL https://download.docker.com/linux/ubuntu/gpg \
		| gpg --dearmor -o /etc/apt/keyrings/docker.gpg
	chmod a+r /etc/apt/keyrings/docker.gpg
	CODENAME="$(. /etc/os-release && echo "$VERSION_CODENAME")"
	echo "deb [arch=$(dpkg --print-architecture) signed-by=/etc/apt/keyrings/docker.gpg] https://download.docker.com/linux/ubuntu $CODENAME stable" \
		> /etc/apt/sources.list.d/docker.list
	apt-get update -y
	apt-get install -y docker-ce docker-ce-cli containerd.io \
		docker-buildx-plugin docker-compose-plugin
else
	echo "[=] Docker already installed."
fi

# --- Create user --> analyst ---
if ! id analyst > /dev/null 2>&1; then
	echo "[+] Creating user : Analyst...."
	useradd -m -s /bin/bach analyst
	echo "analyst:blue_team_rocks" | chpasswd
	usermod -aG docker analyst
else
	echo "[=] analyst user already exists."
	usermod -aG docker analyst || true
fi

# --- move ssh port to 2275 ---
echo "[+] Configuring SSH on port 2275 ...."
if systemctl is-enabled ssh.socket >/dev/null 2>&1; then
	systemctl disable --now ssh.socket || true
	systemctl enable --now ssh.service
fi
sed -i 's/^#\?Port .*/Port 2275/' /etc/ssh/sshd_config
systemctl restart ssh

# --- prepare log directory ---
echo "[+] Preparing /opt/admin/logs ...."
mkdir -p /opt/admin/logs
chown analyst:analyst /opt/admin/logs

# --- build the lab ( docker up ) ---
echo "[+] Building and starting Docker compose stack ...."
cd "$(dirname "$0")"
docker compose up -d --build

echo ""
echo "[✓] Provisioning complete!"
echo ""
echo "	Web app:	http://<vm-ip>:3075"
echo "	SSH:		ssh -p 2275 analyst@<vm-ip>	(password: blue_team_rocks)"
echo " 	Logs:		/opt/admin/logs/{access.log.error.log}"
echo ""
