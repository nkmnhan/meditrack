import axios from "axios";
import { User } from "oidc-client-ts";

const apiClient = axios.create();

export function configureAxiosAuth(getUser: () => User | null | undefined) {
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
        window.location.href = "/";
      }
      return Promise.reject(error);
    },
  );
}

export { apiClient };
