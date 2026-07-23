// ==UserScript==
// @name         OMSGuru Ticket Panel Tools
// @namespace    https://admin.omsguru.com/
// @version      1.0.0
// @description  Authorised bulk ticket updates and dispatch-log requeue helpers.
// @match        https://admin.omsguru.com/*
// @grant        none
// ==/UserScript==

(() => {
  "use strict";

  const DELAY_MS = 1000;
  const TICKET_PATH = "/help_desk/agent_tickets/view/";
  const tools = [
    { id: "reminder", label: "Set ticket reminder", needs: ["ticketUrls", "reminder", "note"] },
    { id: "channel", label: "Set Waiting for Channel Updates", needs: ["ticketUrls", "note"] },
    { id: "jira", label: "Remove JIRA ID", needs: ["ticketUrls"] },
    { id: "dispatch", label: "Re-run dispatch logs", needs: ["clientId", "dispatchIds"] },
  ];

  const sleep = (ms) => new Promise((resolve) => setTimeout(resolve, ms));
  const timestamp = () => new Date().toLocaleString();
  const csv = (rows) => rows.map((row) => row.map((cell) => `"${String(cell ?? "").replaceAll('"', '""')}"`).join(",")).join("\n");

  function download(filename, rows) {
    const link = document.createElement("a");
    link.href = URL.createObjectURL(new Blob([csv(rows)], { type: "text/csv;charset=utf-8" }));
    link.download = filename;
    link.click();
    URL.revokeObjectURL(link.href);
  }

  function pageTickets() {
    return [...new Set([...document.querySelectorAll(`a[href*='${TICKET_PATH}']`)].map((anchor) => anchor.href.split("#")[0]))];
  }

  function parseTickets(raw) {
    const pasted = raw.split(/\s|,/).map((value) => value.trim()).filter(Boolean);
    return [...new Set((pasted.length ? pasted : pageTickets()).filter((url) => url.includes(TICKET_PATH)))];
  }

  async function updateTicket(ticketUrl, fields) {
    const ticketId = ticketUrl.match(/view\/(\d+)/)?.[1];
    if (!ticketId) throw new Error("Invalid ticket URL");
    const body = new URLSearchParams({ _method: "POST", ...fields });
    const response = await fetch(`/help_desk/agent_tickets/update_ticket_status/${ticketId}`, {
      method: "POST", credentials: "same-origin",
      headers: { "Content-Type": "application/x-www-form-urlencoded" }, body,
    });
    if (!response.ok) throw new Error(`HTTP ${response.status}`);
  }

  async function requeueDispatchLog(clientId, dispatchId) {
    const body = new URLSearchParams({ "data[Invoice][client_id]": clientId, "data[Invoice][dispatch_log_id]": dispatchId });
    const response = await fetch("/tickets/reQueueDispatchLogShipmentTracker", {
      method: "POST", credentials: "same-origin",
      headers: { "Content-Type": "application/x-www-form-urlencoded" }, body,
    });
    if (!response.ok) throw new Error(`HTTP ${response.status}`);
  }

  function createPanel() {
    const root = document.createElement("div");
    root.innerHTML = `
      <style>
        #oms-tools { position:fixed; right:18px; bottom:18px; z-index:99999; font:14px system-ui,sans-serif; color:#eaf0ff; }
        #oms-tools button { cursor:pointer; border:0; border-radius:6px; padding:9px 12px; font:inherit; font-weight:700; }
        #oms-tools-toggle { background:#167a68; color:white; box-shadow:0 4px 16px #0007; }
        #oms-tools-panel { display:none; width:390px; max-height:80vh; overflow:auto; margin-bottom:9px; padding:16px; border:1px solid #41567d; border-radius:10px; background:#15213a; box-shadow:0 10px 32px #0008; }
        #oms-tools-panel.open { display:block; } #oms-tools h3 { margin:0 0 12px; } #oms-tools label { display:grid; gap:4px; margin:9px 0; color:#cdd8ed; font-size:12px; }
        #oms-tools input, #oms-tools select, #oms-tools textarea { box-sizing:border-box; width:100%; border:1px solid #4b6088; border-radius:5px; padding:7px; background:#0d1628; color:white; font:inherit; }
        #oms-tools textarea { min-height:80px; resize:vertical; } #oms-tools .help { color:#9faccc; margin:4px 0; font-size:12px; }
        #oms-tools .warning { color:#ffd37a; } #oms-tools .run { background:#36b99d; color:#06201c; width:100%; margin-top:10px; } #oms-tools .close { background:#374a6d; color:white; float:right; }
        #oms-tools .progress { min-height:20px; margin-top:10px; white-space:pre-wrap; color:#b9c8e4; } #oms-tools .hidden { display:none; }
      </style>
      <section id="oms-tools-panel" aria-label="OMSGuru Ticket Panel Tools">
        <button class="close" type="button">×</button><h3>OMSGuru Ticket Panel Tools</h3>
        <p class="help warning">Use only for authorised changes. A CSV audit log downloads after each run.</p>
        <label>Action<select id="oms-action">${tools.map((tool) => `<option value="${tool.id}">${tool.label}</option>`).join("")}</select></label>
        <label class="ticket-field">Ticket URLs (optional)<textarea id="oms-ticket-urls" placeholder="Paste ticket URLs, one per line. Leave blank to use ticket links on this page."></textarea></label>
        <p class="help ticket-field" id="oms-page-count"></p>
        <label class="reminder-field">Reminder date and time<input id="oms-reminder" type="datetime-local"></label>
        <label class="note-field">Internal note<textarea id="oms-note" placeholder="Required for reminders and status changes"></textarea></label>
        <label class="dispatch-field hidden">Client ID<input id="oms-client-id" placeholder="Client ID"></label>
        <label class="dispatch-field hidden">Dispatch log IDs<textarea id="oms-dispatch-ids" placeholder="Comma-separated or one per line"></textarea></label>
        <label><input id="oms-confirm" type="checkbox"> I have verified the action and ticket list.</label>
        <button class="run" id="oms-run" type="button">Review and run</button>
        <div class="progress" id="oms-progress"></div>
      </section>
      <button id="oms-tools-toggle" type="button">Ticket Tools</button>`;
    document.body.append(root);
    return root;
  }

  function initialise() {
    const root = createPanel();
    const panel = root.querySelector("#oms-tools-panel");
    const action = root.querySelector("#oms-action");
    const ticketUrls = root.querySelector("#oms-ticket-urls");
    const reminder = root.querySelector("#oms-reminder");
    const note = root.querySelector("#oms-note");
    const clientId = root.querySelector("#oms-client-id");
    const dispatchIds = root.querySelector("#oms-dispatch-ids");
    const confirm = root.querySelector("#oms-confirm");
    const run = root.querySelector("#oms-run");
    const progress = root.querySelector("#oms-progress");
    root.querySelector("#oms-page-count").textContent = `${pageTickets().length} ticket links detected on this page.`;
    root.querySelector("#oms-tools-toggle").onclick = () => panel.classList.toggle("open");
    root.querySelector(".close").onclick = () => panel.classList.remove("open");

    const refreshFields = () => {
      const tool = tools.find((item) => item.id === action.value);
      root.querySelectorAll(".ticket-field").forEach((node) => node.classList.toggle("hidden", !tool.needs.includes("ticketUrls")));
      root.querySelectorAll(".reminder-field").forEach((node) => node.classList.toggle("hidden", !tool.needs.includes("reminder")));
      root.querySelectorAll(".note-field").forEach((node) => node.classList.toggle("hidden", !tool.needs.includes("note")));
      root.querySelectorAll(".dispatch-field").forEach((node) => node.classList.toggle("hidden", !tool.needs.includes("dispatchIds")));
    };
    action.onchange = refreshFields; refreshFields();

    run.onclick = async () => {
      const tool = tools.find((item) => item.id === action.value);
      const tickets = parseTickets(ticketUrls.value);
      const ids = [...new Set(dispatchIds.value.split(/\s|,/).map((item) => item.trim()).filter(Boolean))];
      if (!confirm.checked) return alert("Please confirm that you have verified this bulk action.");
      if (tool.needs.includes("ticketUrls") && !tickets.length) return alert("No valid ticket URLs found.");
      if (tool.needs.includes("reminder") && !reminder.value) return alert("Reminder date and time is required.");
      if (tool.needs.includes("note") && !note.value.trim()) return alert("Internal note is required.");
      if (tool.id === "dispatch" && (!clientId.value.trim() || !ids.length)) return alert("Client ID and dispatch log IDs are required.");
      const count = tool.id === "dispatch" ? ids.length : tickets.length;
      if (!confirm(`You are about to run “${tool.label}” for ${count} item(s). Continue?`)) return;
      run.disabled = true; const logs = tool.id === "dispatch" ? [["Dispatch Log ID", "Status", "Timestamp"]] : [["Ticket URL", "Status", "Timestamp"]];
      const items = tool.id === "dispatch" ? ids : tickets;
      for (let index = 0; index < items.length; index += 1) {
        const item = items[index]; progress.textContent = `Processing ${index + 1}/${items.length}: ${item}`;
        try {
          if (tool.id === "reminder") await updateTicket(item, { "data[reminder_timestamp]": reminder.value, "data[note]": note.value.trim() });
          if (tool.id === "channel") await updateTicket(item, { "data[internal_status_id]": "4", "data[note]": note.value.trim() });
          if (tool.id === "jira") await updateTicket(item, { "data[note]": " ", "data[jira_url]": "" });
          if (tool.id === "dispatch") await requeueDispatchLog(clientId.value.trim(), item);
          logs.push([item, "Success", timestamp()]);
        } catch (error) { logs.push([item, `Error: ${error.message}`, timestamp()]); }
        if (index < items.length - 1) await sleep(DELAY_MS);
      }
      download(`omsguru_${tool.id}_log_${Date.now()}.csv`, logs);
      progress.textContent = `Complete: ${items.length} item(s) processed. Audit log downloaded.`;
      run.disabled = false; confirm.checked = false;
    };
  }

  if (document.readyState === "loading") document.addEventListener("DOMContentLoaded", initialise); else initialise();
})();
