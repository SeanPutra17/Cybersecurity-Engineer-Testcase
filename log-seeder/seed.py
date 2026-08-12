#!/usr/bin/env python3
"""Log seeder - writes fabricated attack timeline for Blue Team."""

from pathlib import Path

LOG_DIR = Path("/opt/admin/logs")
ACCESS_LOG = LOG_DIR / "access.log"
ERROR_LOG = LOG_DIR / "error.log"

DATE = "12/Aug/2026"

B64 = "UEhBTlRPTUdSSUR7QkxVRV9MMGdfSHVudDNyX00wc3Qzcn0"

def nginx_line(ip, ts, method, path, status, ua, xff="-"):
  return (
    f'{ip} - - [{ts} +0700] '
    f'"{method} {path} HTTP/1.1" {status} 512 '
    f'"-" "{ua}" "{xff}"'
  )

def seed_access_log():
  lines = [
    nginx_line("192.168.1.100", f"{DATE}:18:45:03", "GET", "/", 200,
                   "Mozilla/5.0 (X11; Ubuntu; Linux x86_64) Firefox/128.0"),
        nginx_line("192.168.1.100", f"{DATE}:18:47:11", "GET", "/api/verify-mfa", 200,
                   "Mozilla/5.0 (X11; Ubuntu; Linux x86_64) Firefox/128.0"),
        nginx_line("192.168.1.100", f"{DATE}:18:47:20", "POST", "/api/verify-mfa", 302,
                   "Mozilla/5.0 (X11; Ubuntu; Linux x86_64) Firefox/128.0"),
        nginx_line("192.168.1.100", f"{DATE}:18:47:22", "GET", "/dashboard", 200,
                   "Mozilla/5.0 (X11; Ubuntu; Linux x86_64) Firefox/128.0"),
        nginx_line("10.10.14.50", f"{DATE}:18:49:02", "GET", "/", 200, "Mozilla/5.0"),
        nginx_line("10.10.14.50", f"{DATE}:18:49:10", "GET", "/robots.txt", 200, "Mozilla/5.0"),
        nginx_line("10.10.14.50", f"{DATE}:18:50:15", "POST", "/feedback", 403, "Mozilla/5.0"),
        nginx_line("10.10.14.50", f"{DATE}:18:50:47", "POST", "/feedback", 200, "Mozilla/5.0"),
        nginx_line("10.10.14.50", f"{DATE}:18:51:55", "GET", "/dashboard", 200, "Mozilla/5.0", xff=B64),
    ]
  ACCESS_LOG.write_text("\n".join(lines) + "\n")
  print(f"[seeder] wrote {len(lines)} lines to {ACCESS_LOG}")

def seed_error_log():
  lines = [
    "2026/08/12 18:50:15 [error] 1#1: *1 WAF BLOCK <script> tag from client 10.10.14.50, method=POST, uri=/feedback",
        "2026/08/12 18:52:03 [CRITICAL] session cookie reuse detected from client 10.10.14.50 - cookie prefix adm_sess replayed without prior /api/verify-mfa",
        "2026/08/12 18:53:10 [alert] Authentication bypass anomaly detected: client 10.10.14.50 accessed /dashboard without completing MFA verification flow",
    ]
  ERROR_LOG.write_text("\n".join(lines) + "\n")
  print(f"[seeder] wrote {len(lines)} lines to {ERROR_LOG}")

def main():
  LOG_DIR.mkdir(parents=True, exist_ok=True)
  seed_access_log()
  seed_error_log()
  print("[seeder] done.")

if __name__ == "__main__":
  main()
