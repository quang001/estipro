import { createContext, useCallback, useContext, useEffect, useMemo, useState } from "react";
import { authApi, clearStoredSession, getErrorMessage, getStoredToken, getStoredUser } from "../services/api";

const AuthContext = createContext(null);

export function AuthProvider({ children }) {
  const [token, setToken] = useState(() => getStoredToken());
  const [user, setUser] = useState(() => getStoredUser());
  const [booting, setBooting] = useState(Boolean(getStoredToken()));
  const [error, setError] = useState("");

  const logout = useCallback(() => {
    clearStoredSession();
    setToken(null);
    setUser(null);
  }, []);

  const refreshMe = useCallback(async () => {
    if (!getStoredToken()) {
      setBooting(false);
      return null;
    }

    try {
      setError("");
      const nextUser = await authApi.me();
      setUser(nextUser);
      setToken(getStoredToken());
      return nextUser;
    } catch (err) {
      setError(getErrorMessage(err, "Phiên đăng nhập không còn hợp lệ"));
      logout();
      return null;
    } finally {
      setBooting(false);
    }
  }, [logout]);

  useEffect(() => {
    refreshMe();
  }, [refreshMe]);

  useEffect(() => {
    const handleUnauthorized = () => logout();
    window.addEventListener("estipro:unauthorized", handleUnauthorized);
    return () => window.removeEventListener("estipro:unauthorized", handleUnauthorized);
  }, [logout]);

  const login = useCallback(async (username, password) => {
    setError("");
    const session = await authApi.login(username, password);
    setToken(session.token);
    setUser(session.user);
    return session.user;
  }, []);

  const value = useMemo(
    () => ({
      token,
      user,
      booting,
      error,
      isAuthenticated: Boolean(token && user),
      login,
      logout,
      refreshMe,
      changePassword: authApi.changePassword,
    }),
    [booting, error, login, logout, refreshMe, token, user],
  );

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth() {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error("useAuth must be used inside AuthProvider");
  return ctx;
}
