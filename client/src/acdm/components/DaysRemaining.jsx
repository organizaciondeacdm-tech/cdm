import { diasRestantes } from "../utils/dateUtils";

// ============================================================
// DAYS REMAINING BADGE
// ============================================================
export function DaysRemaining({ fechaFin, diasAutorizados, fechaInicio }) {
    if (!fechaFin) return null;
    const dias = diasRestantes(fechaFin);
    // Proper classification: danger (0-5 days), warning (6-10 days), ok (>10 days)
    const cls = dias <= 0 ? "days-danger" : dias <= 5 ? "days-danger" : dias <= 10 ? "days-warn" : "days-ok";
    const icon = dias <= 0 ? "🔴" : dias <= 5 ? "⚠️" : dias <= 10 ? "🟡" : "🟢";
    const label = dias <= 0 ? "VENCIDA" : dias === 1 ? "1 día" : `${dias} días`;
    return (
        <span className={`days-remaining ${cls}`}>
            {icon} {label}
        </span>
    );
}
