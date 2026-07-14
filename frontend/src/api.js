import axios from "axios"
import { ACCESS_TOKEN, REFRESH_TOKEN } from "./constants"

const api = axios.create({
    baseURL: import.meta.env.VITE_API_URL || "http://127.0.0.1:8000"
})

const refreshClient = axios.create({
    baseURL: import.meta.env.VITE_API_URL || "http://127.0.0.1:8000"
})

let refreshRequest = null

const clearAuthTokens = () => {
    localStorage.removeItem(ACCESS_TOKEN)
    localStorage.removeItem(REFRESH_TOKEN)
}

api.interceptors.request.use(
    (config) => {
        const token = localStorage.getItem(ACCESS_TOKEN);
        if (token) {
            config.headers.Authorization = `Bearer ${token}`
        }
        return config
    },
    (error) => {
        return Promise.reject(error)
    }
)

api.interceptors.response.use(
    (response) => response,
    async (error) => {
        const originalRequest = error.config
        const refreshToken = localStorage.getItem(REFRESH_TOKEN)

        if (
            error.response?.status !== 401 ||
            !originalRequest ||
            originalRequest._retry ||
            !refreshToken ||
            originalRequest.url === "/api/token/refresh/"
        ) {
            return Promise.reject(error)
        }

        originalRequest._retry = true

        try {
            if (!refreshRequest) {
                refreshRequest = refreshClient
                    .post("/api/token/refresh/", { refresh: refreshToken })
                    .finally(() => {
                        refreshRequest = null
                    })
            }

            const response = await refreshRequest
            const nextAccessToken = response.data.access

            localStorage.setItem(ACCESS_TOKEN, nextAccessToken)
            originalRequest.headers = originalRequest.headers || {}
            originalRequest.headers.Authorization = `Bearer ${nextAccessToken}`

            return api(originalRequest)
        } catch (refreshError) {
            clearAuthTokens()
            return Promise.reject(refreshError)
        }
    }
)

export default api
