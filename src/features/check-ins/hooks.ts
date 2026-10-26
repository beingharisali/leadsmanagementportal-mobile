import { keepPreviousData, useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import * as Location from "expo-location";

import { useCurrentUser } from "@/features/auth/auth-provider";
import { useHasFeature } from "@/features/plans/hooks";
import { apiClient } from "@/lib/api-client";

import type { CheckInBoard, CheckInLocation, MyCheckIn } from "./types";

/** Same endpoints as the website (server/src/modules/check-ins). */
const checkInsApi = {
  me: () => apiClient.get<MyCheckIn>("/check-ins/me"),
  checkIn: (location: CheckInLocation | null) => apiClient.post<MyCheckIn>("/check-ins/check-in", { location, source: "mobile" }),
  startBreak: () => apiClient.post<MyCheckIn>("/check-ins/breaks/start"),
  endBreak: () => apiClient.post<MyCheckIn>("/check-ins/breaks/end"),
  checkOut: (location: CheckInLocation | null) => apiClient.post<MyCheckIn>("/check-ins/check-out", { location }),
  board: (date: string) => apiClient.get<CheckInBoard>("/check-ins/board", { date }),
};

export const checkInKeys = {
  all: ["check-ins"] as const,
  me: () => [...checkInKeys.all, "me"] as const,
  board: (date: string) => [...checkInKeys.all, "board", date] as const,
};

/** Whether the signed-in person checks in: the company has the feature, and they aren't the owner. */
export function useChecksIn() {
  const user = useCurrentUser();
  return useHasFeature("checkIns") && Boolean(user.organization?.features) && user.role !== "owner";
}

export function useMyCheckIn() {
  const enabled = useChecksIn();
  return useQuery({ queryKey: checkInKeys.me(), queryFn: checkInsApi.me, enabled, refetchInterval: 60_000 });
}

export function useCheckInBoard(date: string) {
  const enabled = useHasFeature("checkIns");
  return useQuery({
    queryKey: checkInKeys.board(date),
    queryFn: () => checkInsApi.board(date),
    enabled,
    placeholderData: keepPreviousData,
  });
}

/** The phone's location, asking for permission first; throws a message saying how to allow it. */
export async function currentLocation(): Promise<CheckInLocation> {
  const permission = await Location.requestForegroundPermissionsAsync();
  if (!permission.granted) {
    throw new Error("Allow location for GetCloseWise in your phone's settings, then try again. Checking in needs your location.");
  }
  const position = await Location.getCurrentPositionAsync({ accuracy: Location.Accuracy.Balanced });
  return {
    lat: position.coords.latitude,
    lng: position.coords.longitude,
    accuracy: position.coords.accuracy !== null ? Math.round(position.coords.accuracy) : null,
  };
}

function useCheckInMutation<TVars>(mutationFn: (vars: TVars) => Promise<MyCheckIn>) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn,
    onSuccess: (data) => {
      queryClient.setQueryData(checkInKeys.me(), data);
      void queryClient.invalidateQueries({ queryKey: checkInKeys.all });
    },
  });
}

/**
 * Checking in needs the location; without it there's no check-in, unless the
 * person's rules make the location optional.
 */
export const useCheckIn = () =>
  useCheckInMutation(async ({ locationRequired }: { locationRequired: boolean }) =>
    checkInsApi.checkIn(locationRequired ? await currentLocation() : await currentLocation().catch(() => null)),
  );
export const useStartBreak = () => useCheckInMutation(() => checkInsApi.startBreak());
export const useEndBreak = () => useCheckInMutation(() => checkInsApi.endBreak());
/** Checking out records the location when the phone gives it, but never waits on it. */
export const useCheckOut = () =>
  useCheckInMutation(async () => checkInsApi.checkOut(await currentLocation().catch(() => null)));
