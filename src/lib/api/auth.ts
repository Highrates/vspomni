import api from "../axios";

export const authApi = {
    login : () => api.post("/auth/login"),
    signup: () => api.post("/auth/signup"),
    me: () => api.get("/auth/me"),
}