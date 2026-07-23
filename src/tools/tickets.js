import { downloadCsv } from "../ui/export.js";

const STORAGE_KEY = "omsguru.utility-suite.ticket-reminders.v1";
const OPEN_STATUSES = new Set(["open", "waiting"]);

function readTickets() {
  try {
    const value = JSON.parse(localStorage.getItem(STORAGE_KEY) || "[]");
    return Array.isArray(value) ? value : [];
  } catch { return []; }
}

function saveTickets(tickets) { localStorage.setItem(STORAGE_KEY, JSON.stringify(tickets)); }

export function createTicketStore() {
  let tickets = readTickets();
  return {
    all() { return [...tickets].sort((a, b) => new Date(a.remindAt) - new Date(b.remindAt)); },
    add(input) {
      const ticket = { id: crypto.randomUUID(), ticketId: input.ticketId.trim(), subject: input.subject.trim(), assignee: input.assignee.trim(), priority: input.priority, status: "open", remindAt: input.remindAt, notes: input.notes.trim(), createdAt: new Date().toISOString() };
      tickets = [...tickets, ticket]; saveTickets(tickets); return ticket;
    },
    updateStatus(id, status) { tickets = tickets.map((ticket) => ticket.id === id ? { ...ticket, status } : ticket); saveTickets(tickets); },
    remove(id) { tickets = tickets.filter((ticket) => ticket.id !== id); saveTickets(tickets); },
    export() { downloadCsv("omsguru-ticket-reminders.csv", tickets.map(({ id, ...ticket }) => ticket)); },
  };
}

export function reminderState(ticket, now = new Date()) {
  if (!OPEN_STATUSES.has(ticket.status)) return "closed";
  const difference = new Date(ticket.remindAt).getTime() - now.getTime();
  if (difference <= 0) return "overdue";
  if (difference <= 60 * 60 * 1000) return "due-soon";
  return "scheduled";
}
