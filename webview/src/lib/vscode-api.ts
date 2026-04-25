/**
 * Wrapper around acquireVsCodeApi() for typed messaging with the extension host.
 */

interface VsCodeApi {
  postMessage(message: unknown): void;
  getState(): unknown;
  setState(state: unknown): void;
}

let vscodeApi: VsCodeApi | undefined;

export function getVsCodeApi(): VsCodeApi {
  if (!vscodeApi) {
    vscodeApi = acquireVsCodeApi();
  }
  return vscodeApi;
}

export function postMessageToHost(message: unknown): void {
  getVsCodeApi().postMessage(message);
}
