/// <reference types="chrome" />

declare namespace chrome {
  export const runtime: typeof chrome.runtime;
  export const tabs: typeof chrome.tabs;
  export const storage: typeof chrome.storage;
  export const webNavigation: typeof chrome.webNavigation;
}
