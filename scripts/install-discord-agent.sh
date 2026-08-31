#!/bin/zsh
set -euo pipefail

repo_dir="$(cd "$(dirname "$0")/.." && pwd)"
node_dir="$(dirname "$(command -v node)")"
codex_dir="$(dirname "$(command -v codex)")"
config_dir="$HOME/Library/Application Support/RetroPortingToolkitDiscordAgent"
config_file="$config_dir/config.env"
plist="$HOME/Library/LaunchAgents/com.retroportingtoolkit.discord-agent.plist"
log_dir="$HOME/Library/Logs/RetroPortingToolkitDiscordAgent"

if [[ ! -f "$config_file" ]]; then
  echo "Missing $config_file" >&2
  echo "Create it with DISCORD_ALLOWED_GUILD_IDS, DISCORD_ALLOWED_CHANNEL_IDS, and either DISCORD_ALLOWED_USER_IDS or DISCORD_ALLOWED_ROLE_IDS." >&2
  exit 1
fi

if ! security find-generic-password -s retroportingtoolkit-discord-bot -w >/dev/null 2>&1; then
  echo "Missing Keychain item: retroportingtoolkit-discord-bot" >&2
  exit 1
fi

mkdir -p "$log_dir"
chmod 700 "$config_dir" "$log_dir"

launch_script="$config_dir/run.zsh"
cat > "$launch_script" <<EOF
#!/bin/zsh
set -a
source "${config_file}"
set +a
export PATH="${node_dir}:${codex_dir}:/usr/local/bin:/usr/bin:/bin:/usr/sbin:/sbin"
export DISCORD_BOT_TOKEN="\$(security find-generic-password -s retroportingtoolkit-discord-bot -w)"
exec "$(command -v node)" "${repo_dir}/scripts/discord-agent.mjs"
EOF
chmod 700 "$launch_script"

cat > "$plist" <<EOF
<?xml version="1.0" encoding="UTF-8"?>
<!DOCTYPE plist PUBLIC "-//Apple//DTD PLIST 1.0//EN" "http://www.apple.com/DTDs/PropertyList-1.0.dtd">
<plist version="1.0"><dict>
  <key>Label</key><string>com.retroportingtoolkit.discord-agent</string>
  <key>ProgramArguments</key><array><string>${launch_script}</string></array>
  <key>WorkingDirectory</key><string>${repo_dir}</string>
  <key>RunAtLoad</key><true/>
  <key>KeepAlive</key><true/>
  <key>ThrottleInterval</key><integer>15</integer>
  <key>StandardOutPath</key><string>${log_dir}/stdout.log</string>
  <key>StandardErrorPath</key><string>${log_dir}/stderr.log</string>
</dict></plist>
EOF

plutil -lint "$plist"
launchctl bootout "gui/$(id -u)/com.retroportingtoolkit.discord-agent" >/dev/null 2>&1 || true
for attempt in 1 2 3; do
  if launchctl bootstrap "gui/$(id -u)" "$plist"; then
    break
  fi
  if [[ "$attempt" -eq 3 ]]; then
    echo "Could not start com.retroportingtoolkit.discord-agent after 3 attempts." >&2
    exit 1
  fi
  sleep 1
done
echo "Installed and started com.retroportingtoolkit.discord-agent"
