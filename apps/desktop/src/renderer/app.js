const $ = (id) => document.getElementById(id);
const number = new Intl.NumberFormat();

let replayFile = null;

async function refreshSettings() {
  const settings = await window.desktop.getSettings();
  $("serverUrl").value = settings.serverUrl;
  $("logDirectory").value = settings.logDirectory;
  $("tokenState").textContent = settings.hasToken ? "token saved" : "no token set";
}

function render(status) {
  $("dot").className = `dot ${status.connection}`;
  $("connection").textContent = status.connection;
  $("detail").textContent = status.detail ?? "";
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
  $("detail").textContent = "Settings saved";
});

$("pickDir").addEventListener("click", async () => {
  const directory = await window.desktop.pickLogDirectory();
  if (directory === null) return;
  $("logDirectory").value = directory;
  await window.desktop.saveSettings({ logDirectory: directory });
});

$("redeem").addEventListener("click", async () => {
  const code = $("linkCode").value.trim();
  if (code.length === 0) return;

  const result = await window.desktop.redeemLinkCode(code);
  $("linkCode").value = "";
  $("detail").textContent = result.ok ? `Linked as ${result.username}` : result.error;
  await refreshSettings();
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
