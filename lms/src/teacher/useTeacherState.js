import { useSyncExternalStore } from "react";

export default function useTeacherState(controller) {
  return useSyncExternalStore(
    controller.subscribeTeacherState,
    controller.getTeacherStateSnapshot,
    controller.getTeacherStateSnapshot,
  );
}
