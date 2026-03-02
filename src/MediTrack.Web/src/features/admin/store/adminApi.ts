import { createApi } from "@reduxjs/toolkit/query/react";
import { createBaseQueryWithReauth } from "@/shared/auth/baseQueryWithReauth";
import type {
  UserSearchParams,
  PagedUsersResponse,
  ChangeUserRoleRequest,
} from "../types";

const IDENTITY_API_URL =
  import.meta.env.VITE_IDENTITY_URL || "https://localhost:5001";

export const adminApi = createApi({
  reducerPath: "adminApi",
  baseQuery: createBaseQueryWithReauth(IDENTITY_API_URL),
  tagTypes: ["Users"],
  endpoints: (builder) => ({
    getUsers: builder.query<PagedUsersResponse, UserSearchParams>({
      query: (params) => ({
        url: "/api/users",
        params: {
          ...(params.role && { role: params.role }),
          ...(params.status && { status: params.status }),
          ...(params.search && { search: params.search }),
          pageNumber: params.pageNumber ?? 1,
          pageSize: params.pageSize ?? 25,
        },
      }),
      providesTags: ["Users"],
    }),

    changeUserRole: builder.mutation<void, { userId: string; body: ChangeUserRoleRequest }>({
      query: ({ userId, body }) => ({
        url: `/api/users/${userId}/role`,
        method: "POST",
        body,
      }),
      invalidatesTags: ["Users"],
    }),

    deactivateUser: builder.mutation<void, string>({
      query: (userId) => ({
        url: `/api/users/${userId}/deactivate`,
        method: "POST",
      }),
      invalidatesTags: ["Users"],
    }),

    activateUser: builder.mutation<void, string>({
      query: (userId) => ({
        url: `/api/users/${userId}/activate`,
        method: "POST",
      }),
      invalidatesTags: ["Users"],
    }),
  }),
});

export const {
  useGetUsersQuery,
  useChangeUserRoleMutation,
  useDeactivateUserMutation,
  useActivateUserMutation,
} = adminApi;
