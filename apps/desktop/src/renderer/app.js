const $ = (id) => document.getElementById(id);
const number = new Intl.NumberFormat();

let replayFile = null;

async function refreshSettings() {
  const settings = await window.desktop.getSettings();
  $("logDirectory").value = settings.logDirectory;
  $("authState").textContent = settings.hasToken
    ? "Discord linked. You can start streaming now."
    : "Discord not linked.";
  $("discordLogin").textContent = settings.hasToken ? "Sign out" : "Sign out";
}

function render(status) {
  $("dot").className = `dot ${status.connection}`;
  $("connection").textContent = status.connection;
  $("detail").textContent = status.detail ?? "";
  const sessionEl = $("sessionId");
  if (sessionEl) {
    sessionEl.textContent = status.sessionId ? `Session ID: ${status.sessionId}` : "Session ID: not connected";
  }
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
