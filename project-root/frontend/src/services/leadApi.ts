import type { AddDiscussionInput, CreateLeadInput, Lead, UpdateLeadInput } from "../types/lead";

const API_BASE_URL = import.meta.env.VITE_API_BASE_URL ?? "http://localhost:8000/api";

async function request<T>(path: string, options?: RequestInit): Promise<T> {
  const response = await fetch(`${API_BASE_URL}${path}`, {
    headers: {
      "Content-Type": "application/json",
      ...options?.headers
    },
    ...options
  });

  if (!response.ok) {
    const error = await response.json().catch(() => ({ message: "Request failed" }));
    throw new Error(error.message ?? "Request failed");
  }

  return response.json();
}

export const leadApi = {
  list: () => request<Lead[]>("/leads"),
  create: (input: CreateLeadInput) =>
    request<Lead>("/leads", {
      method: "POST",
      body: JSON.stringify(input)
    }),
  update: (id: string, input: UpdateLeadInput) =>
    request<Lead>(`/leads/${id}`, {
      method: "PATCH",
      body: JSON.stringify(input)
    }),
  addDiscussion: (id: string, input: AddDiscussionInput) =>
    request<Lead>(`/leads/${id}/discussions`, {
      method: "POST",
      body: JSON.stringify(input)
    })
};
