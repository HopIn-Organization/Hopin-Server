/** Minimal shapes of the GitHub webhook payloads this app consumes. */

export interface InstallationEventPayload {
  action?: string;
  installation?: { id: number | string };
}

export interface PushEventPayload {
  ref?: string;
  installation?: { id: number | string };
  repository?: { id: number | string };
}
