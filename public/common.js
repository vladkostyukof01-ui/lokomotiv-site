async function loadSettingsGlobal() {
  const res = await fetch('/api/settings');
  return res.json();
}
