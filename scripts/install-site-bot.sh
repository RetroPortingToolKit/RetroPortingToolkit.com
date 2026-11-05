#!/bin/zsh
# Installs the site bot as a LaunchAgent and starts it. Replaces the old
# com.retroportingtoolkit.discord-agent job if it is still installed.
set -euo pipefail

repo_dir="$(cd "$(dirname "$0")/.." && pwd)"
node_bin="$(command -v node)"
config_dir="$HOME/Library/Application Support/RetroPortingToolkitDiscordAgent"
log_dir="$HOME/Library/Logs/RetroPortingToolkitDiscordAgent"
label="com.retroportingtoolkit.site-bot"
plist="$HOME/Library/LaunchAgents/$label.plist"

if ! security find-generic-password -s retroportingtoolkit-discord-bot -w >/dev/null 2>&1; then
  echo "Missing Keychain item: retroportingtoolkit-discord-bot" >&2
  exit 1
fi
mkdir -p "$config_dir" "$log_dir"
chmod 700 "$config_dir" "$log_dir"

launch_script="$config_dir/site-bot.zsh"
cat > "$launch_script" <<SCRIPT
#!/bin/zsh
# git on a Mac is Xcode's shim, which refuses to run until each Xcode update's
# licence is accepted; the Command Line Tools' git needs no click.
export DEVELOPER_DIR="/Library/Developer/CommandLineTools"
export PATH="$(dirname "$node_bin"):/usr/local/bin:/usr/bin:/bin:/usr/sbin:/sbin"
export DISCORD_BOT_TOKEN="\$(security find-generic-password -s retroportingtoolkit-discord-bot -w)"
exec "$node_bin" "$repo_dir/scripts/site-bot.mjs"
SCRIPT
chmod 700 "$launch_script"

cat > "$plist" <<PLIST
<?xml version="1.0" encoding="UTF-8"?>
<!DOCTYPE plist PUBLIC "-//Apple//DTD PLIST 1.0//EN" "http://www.apple.com/DTDs/PropertyList-1.0.dtd">
<plist version="1.0"><dict>
  <key>Label</key><string>$label</string>
  <key>ProgramArguments</key><array><string>$launch_script</string></array>
  <key>WorkingDirectory</key><string>$repo_dir</string>
  <key>RunAtLoad</key><true/>
  <key>KeepAlive</key><true/>
  <key>ThrottleInterval</key><integer>30</integer>
  <key>StandardOutPath</key><string>$log_dir/site-bot.log</string>
  <key>StandardErrorPath</key><string>$log_dir/site-bot.log</string>
</dict></plist>
PLIST
plutil -lint "$plist" >/dev/null

old="$HOME/Library/LaunchAgents/com.retroportingtoolkit.discord-agent.plist"
launchctl bootout "gui/$(id -u)/com.retroportingtoolkit.discord-agent" >/dev/null 2>&1 || true
[[ -f "$old" ]] && mv "$old" "$old.disabled"
launchctl bootout "gui/$(id -u)/$label" >/dev/null 2>&1 || true
launchctl bootstrap "gui/$(id -u)" "$plist"
echo "Started $label. Log: $log_dir/site-bot.log"
