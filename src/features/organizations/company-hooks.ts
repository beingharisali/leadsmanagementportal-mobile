import { useMutation, useQueryClient } from "@tanstack/react-query";
import { File } from "expo-file-system";
import { ImageManipulator, SaveFormat } from "expo-image-manipulator";

import { apiClient, apiUrl, authHeaders, readEnvelope } from "@/lib/api-client";
import { authKeys } from "@/lib/query-client";

import type { OrganizationSummary, TeamSize } from "./types";

/** Same as the API (server/src/modules/organizations/organization.constants.ts). */
export const LOGO_MAX_BYTES = 512 * 1024;

export interface CompanyDetails {
  name: string;
  industry: string;
  teamSize: TeamSize | "";
  phone: string;
  city: string;
}

/** The organization comes with the signed-in user, so saving refreshes `/auth/me`. */
function useRefreshMe() {
  const queryClient = useQueryClient();
  return () => void queryClient.invalidateQueries({ queryKey: authKeys.me });
}

/** Owner: company name and details (empty fields are sent as "" so the API clears them). */
export function useUpdateCompany() {
  const refresh = useRefreshMe();
  return useMutation({
    mutationFn: (payload: CompanyDetails) => apiClient.patch<OrganizationSummary>("/organization", payload),
    onSuccess: refresh,
  });
}

/**
 * Owner: sets the logo from a picked photo. It's cropped square by the
 * picker, then shrunk to 512 px JPEG here so it stays under the API's 512 KB.
 */
export function useUploadLogo() {
  const refresh = useRefreshMe();
  return useMutation({
    mutationFn: async (uri: string) => {
      const rendered = await ImageManipulator.manipulate(uri).resize({ width: 512 }).renderAsync();
      const image = await rendered.saveAsync({ compress: 0.8, format: SaveFormat.JPEG });
      const file = new File(image.uri);
      if (file.size > LOGO_MAX_BYTES) throw new Error("The logo must be 512 KB or smaller. Try a simpler image.");
      const result = await file.upload(apiUrl("/organization/logo"), {
        httpMethod: "PUT",
        headers: { ...authHeaders(), Accept: "application/json", "Content-Type": "image/jpeg" },
      });
      return readEnvelope<OrganizationSummary>(result.status, result.body);
    },
    onSuccess: refresh,
  });
}

export function useRemoveLogo() {
  const refresh = useRefreshMe();
  return useMutation({ mutationFn: () => apiClient.delete<OrganizationSummary>("/organization/logo"), onSuccess: refresh });
}

/** The logo image (signed in), versioned so a new upload shows at once. `null` without a logo. */
export function logoSource(organization: Pick<OrganizationSummary, "logo">) {
  if (!organization.logo) return null;
  return {
    uri: apiUrl(`/organization/logo?v=${encodeURIComponent(organization.logo.updatedAt)}`),
    headers: authHeaders(),
  };
}
