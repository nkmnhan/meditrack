import axios from "axios";
import type { User } from "oidc-client-ts";

const apiClient = axios.create();

interface AxiosAuthConfig {
  readonly getUser: () => User | null | undefined;
  readonly onUnauthorized?: () => void;
}

export function configureAxiosAuth({ getUser, onUnauthorized }: AxiosAuthConfig) {
  apiClient.interceptors.request.use((config) => {
    const user = getUser();

    if (user?.access_token) {
      config.headers.Authorization = `Bearer ${user.access_token}`;
    }

    return config;
  });

  apiClient.interceptors.response.use(
    (response) => response,
    (error) => {
      if (axios.isAxiosError(error) && error.response?.status === 401) {
        onUnauthorized?.();
      }
      return Promise.reject(error);
    },
  );
}

export { apiClient };
