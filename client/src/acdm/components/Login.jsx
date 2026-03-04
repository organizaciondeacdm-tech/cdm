import { useState, useEffect } from "react";
import apiService from "../services/acdmApi.js";

// ============================================================
// LOGIN SCREEN
// ============================================================
export function Login({ onLogin }) {
    const MAX_LOCAL_LOGIN_ATTEMPTS = 3;
    const BASE_LOCAL_COOLDOWN_MS = 15 * 1000;
    const MAX_LOCAL_COOLDOWN_MS = 5 * 60 * 1000;

    const [user, setUser] = useState("");
    const [pass, setPass] = useState("");
    const [err, setErr] = useState("");
    const [isSubmitting, setIsSubmitting] = useState(false);
    const [clientFailedAttempts, setClientFailedAttempts] = useState(0);
    const [cooldownUntil, setCooldownUntil] = useState(0);
    const [cooldownSeconds, setCooldownSeconds] = useState(0);

    useEffect(() => {
        if (!cooldownUntil) {
            setCooldownSeconds(0);
            return;
        }

        const tick = () => {
            const remainingMs = Math.max(0, cooldownUntil - Date.now());
            setCooldownSeconds(Math.ceil(remainingMs / 1000));
            if (remainingMs <= 0) {
                setCooldownUntil(0);
            }
        };

        tick();
        const timer = setInterval(tick, 250);
        return () => clearInterval(timer);
    }, [cooldownUntil]);

    async function doLogin() {
        setErr("");
        if (isSubmitting) return;

        if (!user.trim() || !pass) {
            setErr("Usuario y contraseña son requeridos");
            return;
        }

        if (cooldownUntil && Date.now() < cooldownUntil) {
            setErr(`Demasiados intentos. Espere ${cooldownSeconds}s para reintentar.`);
            return;
        }

        setIsSubmitting(true);
        try {
            const response = await apiService.login(user.trim(), pass);
            const responseUser = response?.data?.user || response?.user;
            const accessToken = response?.data?.tokens?.access || response?.token;

            if (!responseUser || !accessToken) {
                throw new Error("Respuesta inválida del servidor de autenticación");
            }

            apiService.setToken(accessToken);
            setClientFailedAttempts(0);
            setCooldownUntil(0);
            onLogin(responseUser);
        } catch (backendError) {
            const status = backendError?.status;
            const backendMessage = backendError?.message || "No se pudo iniciar sesión. Intente nuevamente.";

            if (status === 423 || status === 429) {
                const retryAfterSeconds = Number(backendError?.payload?.retryAfterSeconds) || 60;
                setCooldownUntil(Date.now() + retryAfterSeconds * 1000);
                setClientFailedAttempts(MAX_LOCAL_LOGIN_ATTEMPTS);
                setErr(backendMessage);
            } else {
                const nextFailedAttempts = clientFailedAttempts + 1;
                setClientFailedAttempts(nextFailedAttempts);

                if (nextFailedAttempts >= MAX_LOCAL_LOGIN_ATTEMPTS) {
                    const escalation = nextFailedAttempts - MAX_LOCAL_LOGIN_ATTEMPTS;
                    const cooldownMs = Math.min(
                        MAX_LOCAL_COOLDOWN_MS,
                        BASE_LOCAL_COOLDOWN_MS * Math.pow(2, escalation)
                    );
                    setCooldownUntil(Date.now() + cooldownMs);
                    setErr(`Demasiados intentos fallidos. Espere ${Math.ceil(cooldownMs / 1000)}s para reintentar.`);
                } else if (status === 401) {
                    setErr("Credenciales inválidas");
                } else {
                    setErr(backendMessage);
                }
            }
        } finally {
            setIsSubmitting(false);
        }
    }

    return (
        <div className="login-container">
            <div className="login-box">
                <div style={{ textAlign: 'center', marginBottom: 24 }}>
                    <div style={{ marginBottom: 12, display: 'flex', justifyContent: 'center' }}>
                        <div className="papiweb-logo" style={{ padding: '8px 20px' }}>
                            <div className="papiweb-text" style={{ fontSize: 22, letterSpacing: 3 }}>PAPIWEB</div>
                            <div className="papiweb-sub">Desarrollos Informáticos</div>
                        </div>
                    </div>
                    <div className="login-title">Sistema ACDM</div>
                    <div className="login-sub">Gestión de Asistentes Celadores/as</div>
                </div>
                <div className="form-group">
                    <label className="form-label">Usuario</label>
                    <input className="form-input" value={user} onChange={e => setUser(e.target.value)} onKeyDown={e => e.key === "Enter" && doLogin()} placeholder="Usuario" autoFocus disabled={isSubmitting || cooldownSeconds > 0} />
                </div>
                <div className="form-group">
                    <label className="form-label">Contraseña</label>
                    <input type="password" className="form-input" value={pass} onChange={e => setPass(e.target.value)} onKeyDown={e => e.key === "Enter" && doLogin()} placeholder="••••••••" disabled={isSubmitting || cooldownSeconds > 0} />
                </div>
                {err && <div className="alert alert-danger" style={{ marginBottom: 12 }}><span>⚠️</span>{err}</div>}
                <button
                    className="btn btn-primary"
                    style={{ width: '100%', justifyContent: 'center', marginTop: 8 }}
                    onClick={doLogin}
                    disabled={isSubmitting || cooldownSeconds > 0}
                >
                    {isSubmitting ? "Ingresando..." : cooldownSeconds > 0 ? `Reintentar en ${cooldownSeconds}s` : "Ingresar →"}
                </button>
            </div>
        </div>
    );
}
