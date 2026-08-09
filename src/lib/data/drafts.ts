"use client";

const draftKey = "myos.quick-draft.v1";

export function saveQuickDraft(value: string) {
  window.localStorage.setItem(draftKey, value);
}

export function readQuickDraft() {
  return window.localStorage.getItem(draftKey) || "";
}

export function clearQuickDraft() {
  window.localStorage.removeItem(draftKey);
}
