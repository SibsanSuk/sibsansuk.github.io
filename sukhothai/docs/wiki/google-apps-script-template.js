/**
 * Google Apps Script template for Sukhothai Wiki Team Sync
 *
 * Deploy:
 * 1) script.google.com -> New project
 * 2) Paste this file into Code.gs
 * 3) Deploy > New deployment > Web app
 * 4) Execute as: Me
 * 5) Who has access: Anyone with the link (or your org policy)
 * 6) Copy Web app URL to Sync Endpoint URL in wiki
 */

function doPost(e) {
  try {
    const body = parseBody(e);
    return handleRequest(body);
  } catch (err) {
    return json({ ok: false, error: String(err) });
  }
}

function doGet(e) {
  try {
    const body = parseBody(e);
    return handleRequest(body);
  } catch (err) {
    return json({ ok: false, error: String(err) });
  }
}

function handleRequest(body) {
  const action = (body.action || "").toLowerCase();
  const key = sanitizeKey(body.key || "default");
  const props = PropertiesService.getScriptProperties();

  if (action === "save") {
    const payload = {
      data: body.data || {},
      updatedAt: new Date().toISOString(),
      updatedBy: body.editor || "unknown",
    };
    props.setProperty(`wiki_progress_${key}`, JSON.stringify(payload));
    return json({ ok: true, updatedAt: payload.updatedAt });
  }

  if (action === "load") {
    const raw = props.getProperty(`wiki_progress_${key}`);
    if (!raw) return json({ ok: true, data: null });
    const parsed = JSON.parse(raw);
    return json({ ok: true, ...parsed });
  }

  return json({ ok: false, error: "Invalid action. Use save or load." });
}

function parseBody(e) {
  const params = (e && e.parameter) || {};
  const dataFromParam = parseMaybeJson(params.data);
  const hasParamAction = typeof params.action === "string" && params.action !== "";

  if (hasParamAction) {
    return {
      action: params.action,
      key: params.key || "default",
      editor: params.editor || "unknown",
      data: dataFromParam || {},
    };
  }

  const raw = (e && e.postData && e.postData.contents) || "{}";
  const parsed = parseMaybeJson(raw) || {};
  return {
    action: parsed.action || "",
    key: parsed.key || "default",
    editor: parsed.editor || "unknown",
    data: parsed.data || {},
  };
}

function parseMaybeJson(text) {
  if (typeof text !== "string") return null;
  try {
    return JSON.parse(text);
  } catch (_) {
    return null;
  }
}

function json(data) {
  return ContentService
    .createTextOutput(JSON.stringify(data))
    .setMimeType(ContentService.MimeType.JSON);
}

function sanitizeKey(input) {
  return String(input).toLowerCase().replace(/[^a-z0-9_-]/g, "_").slice(0, 80);
}
