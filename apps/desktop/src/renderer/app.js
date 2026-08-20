const $ = (id) => document.getElementById(id);
const number = new Intl.NumberFormat();

let replayFile = null;

function formatMetric(n) {
  if (!n || n <= 0) return "0";
  if (n >= 1000000) return `${(n / 1000000).toFixed(1)}M`;
  if (n >= 1000) return `${(n / 1000).toFixed(1)}k`;
  return number.format(n);
}

async function refreshSettings() {
  const settings = await window.desktop.getSettings();
  if ($("serverUrl")) $("serverUrl").value = settings.serverUrl || "";
  $("logDirectory").value = settings.logDirectory;
  $("authState").textContent = settings.hasToken
    ? "Discord linked. You can start streaming now."
    : "Discord not linked.";
  $("discordLogin").textContent = settings.hasToken ? "Sign out" : "Sign in with Discord";
}

function render(status) {
  $("dot").className = `dot ${status.connection}`;
  $("connection").textContent = status.connection;
  $("detail").textContent = status.detail ?? "";

  // Character & Boss State
  if ($("detectedCharacter")) {
    $("detectedCharacter").textContent = status.detectedCharacter ?? "—";
  }
  if ($("discipline")) {
    $("discipline").textContent = status.discipline ? `${status.discipline}${status.combatStyle ? ` (${status.combatStyle})` : ""}` : "—";
  }
  if ($("activeBoss")) {
    $("activeBoss").textContent = status.activeBoss ?? "—";
  }
  if ($("lastPullOutcome")) {
    $("lastPullOutcome").textContent = status.lastPullOutcome ?? "—";
  }

  // File & Zone
  $("fileName").textContent = status.fileName ?? "—";
  $("zone").textContent = status.zone ?? "—";
  $("rate").textContent = number.format(status.eventsPerSecond ?? 0);
  $("parsed").textContent = number.format(status.eventsParsed ?? 0);
  if ($("totalEvents")) {
    $("totalEvents").textContent = status.totalEvents ? number.format(status.totalEvents) : "—";
  }

  // Live Telemetry HUD
  if ($("liveDps")) $("liveDps").textContent = formatMetric(status.liveDps);
  if ($("liveHps")) $("liveHps").textContent = formatMetric(status.liveHps);
  if ($("liveDtps")) $("liveDtps").textContent = formatMetric(status.liveDtps);
  if ($("deathsAndWipes")) $("deathsAndWipes").textContent = `${status.deaths ?? 0} / ${status.wipes ?? 0}`;
  if ($("pullsSummary")) $("pullsSummary").textContent = `${status.pullsCount ?? 0} (${status.bossKills ?? 0} / ${status.wipes ?? 0})`;
  if ($("totalDamage")) $("totalDamage").textContent = formatMetric(status.totalDamage);
  if ($("totalHealing")) $("totalHealing").textContent = formatMetric(status.totalHealing);

  // Replay progress
  const replaying = status.replayProgress !== null;
  $("replayWrap").style.display = replaying ? "block" : "none";
  if (replaying) {
    $("replay").value = status.replayProgress;
    if ($("replayPercent")) $("replayPercent").textContent = `${status.replayProgress}%`;
  }

  // Diagnostics Console
  if ($("logConsole") && Array.isArray(status.logs)) {
    const consoleEl = $("logConsole");
    const wasScrolledToBottom = consoleEl.scrollHeight - consoleEl.clientHeight <= consoleEl.scrollTop + 20;
    consoleEl.innerHTML = status.logs.map((line) => `<p>${line.replace(/</g, "&lt;").replace(/>/g, "&gt;")}</p>`).join("");
    if (wasScrolledToBottom) {
      consoleEl.scrollTop = consoleEl.scrollHeight;
    }
  }

  const busy = status.mode !== "idle";
  $("startLive").disabled = busy;
  $("pickReplay").disabled = busy;
  $("stop").disabled = !busy;
}

function showError(result) {
  if (result && result.ok === false) $("detail").textContent = result.error ?? "Failed";
}

if ($("saveServer")) {
  $("saveServer").addEventListener("click", async () => {
    const url = $("serverUrl").value.trim();
    if (url.length === 0) return;
    await window.desktop.saveSettings({ serverUrl: url });
    $("detail").textContent = "Server URL saved.";
  });
}

$("pickDir").addEventListener("click", async () => {
  const directory = await window.desktop.pickLogDirectory();
  if (directory === null) return;
  $("logDirectory").value = directory;
  await window.desktop.saveSettings({ logDirectory: directory });
});

$("discordLogin").addEventListener("click", async () => {
  const settings = await window.desktop.getSettings();
  if (settings.hasToken) {
    const result = await window.desktop.signOutDiscord();
    if (result.ok) {
      $("detail").textContent = "Discord account disconnected.";
      await refreshSettings();
    } else {
      $("detail").textContent = result.error ?? "Discord sign-out failed";
    }
    return;
  }

  const result = await window.desktop.loginWithDiscord();
  if (result.ok) {
    $("detail").textContent = `Discord linked as ${result.discordId}`;
    await refreshSettings();
  } else {
    $("detail").textContent = result.error ?? "Discord sign-in failed";
  }
});

$("startLive").addEventListener("click", async () => {
  showError(await window.desktop.startLive());
});

$("pickReplay").addEventListener("click", async () => {
  replayFile = await window.desktop.pickReplayFile();
  if (replayFile === null) return;
  showError(await window.desktop.startReplay(replayFile, Number($("speed").value)));
});

$("stop").addEventListener("click", () => window.desktop.stop());

window.desktop.onStatus(render);
void refreshSettings();
