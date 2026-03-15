const BASE = "/api/notes";

export interface NoteListItem {
  id: string;
  title: string;
  folder: string;
  updated_at: string;
}

export interface Note {
  id: string;
  title: string;
  content: string;
  folder: string;
  created_at: string;
  updated_at: string;
}

export interface NotePayload {
  title: string;
  content: string;
  folder: string;
}

export interface BacklinkItem {
  id: string;
  title: string;
  folder: string;
}

async function request<T>(url: string, init?: RequestInit): Promise<T> {
  const res = await fetch(url, {
    headers: { "Content-Type": "application/json" },
    ...init,
  });
  if (!res.ok) {
    const text = await res.text();
    throw new Error(`${res.status} ${text}`);
  }
  if (res.status === 204) return undefined as T;
  return res.json();
}

export const notesApi = {
  list: () => request<NoteListItem[]>(BASE),

  get: (id: string) => request<Note>(`${BASE}/${id}`),

  create: (payload: NotePayload) =>
    request<{ id: string; created_at: string; updated_at: string }>(BASE, {
      method: "POST",
      body: JSON.stringify(payload),
    }),

  update: (id: string, payload: NotePayload) =>
    request<{ updated_at: string }>(`${BASE}/${id}`, {
      method: "PUT",
      body: JSON.stringify(payload),
    }),

  delete: (id: string) =>
    request<void>(`${BASE}/${id}`, { method: "DELETE" }),

  backlinks: (id: string) =>
    request<BacklinkItem[]>(`${BASE}/${id}/backlinks`),
};
