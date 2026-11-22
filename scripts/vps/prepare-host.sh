#!/usr/bin/env bash
#
# Prepares a fresh Debian or Ubuntu VPS for the alpha: Docker Engine, a deploy user, SSH with
# keys only (ADR 0019), a firewall open on 80 and 443, security updates and swap.
# Run as root on the host, once; running it again changes nothing that is already in place.
# scripts/vps/setup-vps.sh copies it to the host and runs it there:
#
#   sudo bash prepare-host.sh --admin-user <admin> --deploy-user <user> --deploy-path <path> \
#     --deploy-key '<public key>' [--deploy-key '<public key>' ...]

set -euo pipefail

SWAP_FILE=/swapfile
SWAP_SIZE=2G
SSHD_DROP_IN=/etc/ssh/sshd_config.d/00-mtg-suite.conf

admin_user='' deploy_user='' deploy_path=''
deploy_keys=()
while (($# > 0)); do
  case "$1" in
    --admin-user) admin_user="$2"; shift 2 ;;
    --deploy-user) deploy_user="$2"; shift 2 ;;
    --deploy-path) deploy_path="$2"; shift 2 ;;
    --deploy-key) deploy_keys+=("$2"); shift 2 ;;
    *) echo "unknown option: $1" >&2; exit 2 ;;
  esac
done
if [[ -z "$admin_user" || -z "$deploy_user" || -z "$deploy_path" || ${#deploy_keys[@]} -eq 0 ]]; then
  echo 'needs --admin-user, --deploy-user, --deploy-path and at least one --deploy-key' >&2
  exit 2
fi
[[ $EUID -eq 0 ]] || { echo 'run it as root (sudo)' >&2; exit 1; }

say() { printf '\n== %s\n' "$1"; }

# Disabling passwords with no key in place would lock the admin out of their own server.
admin_home=$(getent passwd "$admin_user" | cut -d: -f6) || {
  echo "no user $admin_user on this host" >&2
  exit 1
}
if [[ ! -s "$admin_home/.ssh/authorized_keys" ]]; then
  echo "$admin_user has no SSH key in $admin_home/.ssh/authorized_keys: add one first" >&2
  exit 1
fi

# `noninteractive`: apt asks no question, keeping each package's default configuration.
export DEBIAN_FRONTEND=noninteractive

say 'Packages'
apt-get update -q
apt-get install -y -q ca-certificates curl openssl ufw unattended-upgrades

say "Docker Engine, from Docker's own repository"
# shellcheck source=/dev/null
. /etc/os-release # ID (debian, ubuntu) and VERSION_CODENAME, which name Docker's repository
install -m 0755 -d /etc/apt/keyrings
curl -fsSL "https://download.docker.com/linux/$ID/gpg" -o /etc/apt/keyrings/docker.asc
chmod a+r /etc/apt/keyrings/docker.asc
cat > /etc/apt/sources.list.d/docker.sources <<EOF
Types: deb
URIs: https://download.docker.com/linux/$ID
Suites: $VERSION_CODENAME
Components: stable
Signed-By: /etc/apt/keyrings/docker.asc
EOF
apt-get update -q
apt-get install -y -q docker-ce docker-ce-cli containerd.io docker-buildx-plugin docker-compose-plugin
systemctl enable --now docker

say "Deploy user $deploy_user"
if ! id "$deploy_user" >/dev/null 2>&1; then
  # No password at all: the user logs in with a key only.
  useradd --create-home --shell /bin/bash "$deploy_user"
fi
# The docker group is what lets the deploy run `docker compose`.
usermod --append --groups docker "$deploy_user"
deploy_home=$(getent passwd "$deploy_user" | cut -d: -f6)
install -d -m 700 -o "$deploy_user" -g "$deploy_user" "$deploy_home/.ssh"
# The keys given replace any earlier list: a key left out is revoked.
printf '%s\n' "${deploy_keys[@]}" > "$deploy_home/.ssh/authorized_keys"
chown "$deploy_user:$deploy_user" "$deploy_home/.ssh/authorized_keys"
chmod 600 "$deploy_home/.ssh/authorized_keys"
install -d -m 750 -o "$deploy_user" -g "$deploy_user" "$deploy_path"

say 'SSH: keys only, no root (ADR 0019)'
# sshd keeps the first value it reads for an option, and reads sshd_config.d in name order:
# `00-` wins over the image's own drop-ins, such as cloud-init's PasswordAuthentication.
cat > "$SSHD_DROP_IN" <<EOF
PermitRootLogin no
PubkeyAuthentication yes
PasswordAuthentication no
KbdInteractiveAuthentication no
AuthenticationMethods publickey
AllowUsers $admin_user $deploy_user
MaxAuthTries 3
X11Forwarding no
EOF
sshd -t # checks the whole configuration; a mistake stops here, before sshd reloads it
systemctl try-reload-or-restart ssh.service
passwd --lock root >/dev/null

say 'Firewall: 80 and 443 open, 22 rate-limited'
ufw default deny incoming
ufw default allow outgoing
# `limit` drops an address that opens 6 or more connections within 30 seconds.
ufw limit 22/tcp
ufw allow 80/tcp
ufw allow 443/tcp
ufw allow 443/udp # HTTP/3
ufw --force enable # --force: no "may disrupt existing ssh connections" prompt

say 'Security updates'
cat > /etc/apt/apt.conf.d/20auto-upgrades <<'EOF'
APT::Periodic::Update-Package-Lists "1";
APT::Periodic::Unattended-Upgrade "1";
EOF
systemctl enable --now unattended-upgrades

say "Swap: $SWAP_SIZE"
if [[ ! -f "$SWAP_FILE" ]]; then
  fallocate -l "$SWAP_SIZE" "$SWAP_FILE"
  chmod 600 "$SWAP_FILE"
  mkswap "$SWAP_FILE"
fi
swapon --show=NAME --noheadings | grep -qx "$SWAP_FILE" || swapon "$SWAP_FILE"
grep -q "^$SWAP_FILE " /etc/fstab || echo "$SWAP_FILE none swap sw 0 0" >> /etc/fstab

say 'Done'
docker --version
swapon --show
ufw status verbose
