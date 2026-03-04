import { getDaysInMonth, getFirstDayOfMonth } from "../utils/dateUtils";

// ============================================================
// CALENDAR COMPONENT
// ============================================================
export function MiniCalendar({ year, month, rangeStart, rangeEnd, onNavigate }) {
    const today = new Date();
    const daysInMonth = getDaysInMonth(year, month);
    const firstDay = getFirstDayOfMonth(year, month);
    const monthNames = ["Enero", "Febrero", "Marzo", "Abril", "Mayo", "Junio", "Julio", "Agosto", "Septiembre", "Octubre", "Noviembre", "Diciembre"];
    const dayNames = ["D", "L", "M", "X", "J", "V", "S"];

    const cells = [];
    for (let i = 0; i < firstDay; i++) cells.push(null);
    for (let d = 1; d <= daysInMonth; d++) cells.push(d);

    function isInRange(d) {
        if (!rangeStart || !rangeEnd || !d) return false;
        const cur = new Date(year, month, d);
        const s = new Date(rangeStart); const e = new Date(rangeEnd);
        return cur >= s && cur <= e;
    }
    function isRangeStart(d) {
        if (!rangeStart || !d) return false;
        const s = new Date(rangeStart);
        return s.getFullYear() === year && s.getMonth() === month && s.getDate() === d;
    }
    function isRangeEnd(d) {
        if (!rangeEnd || !d) return false;
        const e = new Date(rangeEnd);
        return e.getFullYear() === year && e.getMonth() === month && e.getDate() === d;
    }
    function isToday(d) {
        return today.getFullYear() === year && today.getMonth() === month && today.getDate() === d;
    }

    return (
        <div className="calendar">
            <div className="cal-header">
                <button className="btn-icon" onClick={() => onNavigate(-1)}>◀</button>
                <span>{monthNames[month]} {year}</span>
                <button className="btn-icon" onClick={() => onNavigate(1)}>▶</button>
            </div>
            <div className="cal-grid" style={{ padding: '8px' }}>
                {dayNames.map((n, idx) => <div key={`day-${idx}`} className="cal-day-header">{n}</div>)}
                {cells.map((d, i) => (
                    <div key={i} className={[
                        "cal-day",
                        !d ? "empty" : "",
                        d && isToday(d) ? "today" : "",
                        d && isRangeStart(d) ? "range-start" : "",
                        d && isRangeEnd(d) ? "range-end" : "",
                        d && isInRange(d) && !isRangeStart(d) && !isRangeEnd(d) ? "in-range" : "",
                    ].join(" ")}>
                        {d || ""}
                    </div>
                ))}
            </div>
        </div>
    );
}
