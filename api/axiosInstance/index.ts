import axios from "axios";
import { parseCookies } from "nookies";
import { baseUrlApi } from "../endpoints";
// import { refreshAccessToken } from "../functions/user.api";

const axiosInstance = axios.create({
  baseURL: baseUrlApi
});

axiosInstance.interceptors.request.use((config) => {
  const cookies = parseCookies();

  const { token } = cookies;
  if (token && !!config.headers) {
    config.headers["Authorization"] = `Bearer ${token}`;
  }

  return config;
});

export default axiosInstance;
