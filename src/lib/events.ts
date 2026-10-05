type Listener = (workspaceId: string) => void;

const listeners = new Set<Listener>();

export function publishWorkspace(workspaceId: string) {
  for (const listener of listeners) listener(workspaceId);
}

export function subscribeWorkspace(listener: Listener) {
  listeners.add(listener);
  return () => {
    listeners.delete(listener);
  };
}
