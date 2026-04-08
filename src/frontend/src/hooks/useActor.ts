import {
  createActorWithConfig,
  useActor as useCaffeineActor,
} from "@caffeineai/core-infrastructure";
import { createActor } from "../backend";
import type { backendInterface } from "../backend.d";

function createBackendActor(
  ...args: Parameters<typeof createActor>
): backendInterface {
  return createActor(...args);
}

export function useActor(): {
  actor: backendInterface | null;
  isFetching: boolean;
} {
  return useCaffeineActor<backendInterface>(
    (canisterId, uploadFile, downloadFile, options) =>
      createBackendActor(canisterId, uploadFile, downloadFile, options),
  );
}
