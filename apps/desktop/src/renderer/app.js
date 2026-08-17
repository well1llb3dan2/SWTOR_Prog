const $ = (id) => document.getElementById(id);
const number = new Intl.NumberFormat();

let replayFile = null;

async function refreshSettings() {
  const settings = await window.desktop.getSettings();
  $("serverUrl").value = settings.serverUrl;
  $("logDirectory").value = settings.logDirectory;
  $("authState").textContent = settings.hasToken
    ? "Discord linked. You can start streaming now."
    : "Sign in with Discord to link your account and start streaming.";
}

async function refreshApiStatus() {
  const healthResult = await window.desktop.checkApiHealth();
  if (healthResult.ok) {
    const health = healthResult.data;
    $("apiStatus").textContent = `API ${health.status} • ${health.sessions} sessions • ${health.uptimeSeconds}s uptime`;
  } else {
    $("apiStatus").textContent = healthResult.error ?? "API unavailable";
  }

  const reportsResult = await window.desktop.listReports(5);
  if (reportsResult.ok) {
    const reports = reportsResult.data ?? [];
    $("apiReports").textContent =
      reports.length === 0
        ? "No reports yet."
        : reports
            .map((report) => `${report.code} · ${report.zone} · ${report.killCount}/${report.fightCount}`)
            .join(" | ");
  } else {
    $("apiReports").textContent = reportsResult.error ?? "Reports unavailable";
  }
}

function render(status) {
  $("dot").className = `dot ${status.connection}`;
  $("connection").textContent = status.connection;
  $("detail").textContent = status.detail ?? "";
  $("sessionId").textContent = status.sessionId ? `Session ID: ${status.sessionId}` : "Session ID: not connected";
  $("fileName").textContent = status.fileName ?? "—";
  $("zone").textContent = status.zone ?? "—";
  $("rate").textContent = number.format(status.eventsPerSecond);
  $("parsed").textContent = number.format(status.eventsParsed);
  $("queued").textContent = number.format(status.queuedEvents);
  $("unknown").textContent = number.format(status.unknownLines);

  $("report").textContent = status.reportCode === null ? "" : `Report ${status.reportCode}`;

  const replaying = status.replayProgress !== null;
  $("replayWrap").style.display = replaying ? "block" : "none";
  if (replaying) $("replay").value = status.replayProgress;

  const busy = status.mode !== "idle";
  $("startLive").disabled = busy;
  $("pickReplay").disabled = busy;
  $("stop").disabled = !busy;
}

function showError(result) {
  if (result && result.ok === false) $("detail").textContent = result.error ?? "Failed";
}

$("save").addEventListener("click", async () => {
  await window.desktop.saveSettings({
    serverUrl: $("serverUrl").value.trim(),
    token: $("token").value,
    logDirectory: $("logDirectory").value,
  });
  $("token").value = "";
  await refreshSettings();
  await refreshApiStatus();
  $("detail").textContent = "Settings saved";
});

$("pickDir").addEventListener("click", async () => {
  const directory = await window.desktop.pickLogDirectory();
  if (directory === null) return;
  $("logDirectory").value = directory;
  await window.desktop.saveSettings({ logDirectory: directory });
  await refreshApiStatus();
});

$("discordLogin").addEventListener("click", async () => {
  const result = await window.desktop.loginWithDiscord();
  if (result.ok) {
    $("detail").textContent = `Signed in as ${result.discordId}`;
    await refreshSettings();
    await refreshApiStatus();
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
void refreshApiStatus();
