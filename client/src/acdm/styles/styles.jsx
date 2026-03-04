// ============================================================
// STYLES
// ============================================================
const STYLES = `
  @import url('https://fonts.googleapis.com/css2?family=Exo+2:wght@300;400;600;700;900&family=Rajdhani:wght@400;600;700&display=swap');

  :root {
    --bg: #0a0e1a;
    --bg2: #0f1626;
    --bg3: #141d30;
    --card: #111827;
    --card2: #1a2540;
    --border: #1e3a5f;
    --border2: #2a4a7f;
    --accent: #00d4ff;
    --accent2: #0099cc;
    --accent3: #00ff88;
    --gold: #ffd700;
    --red: #ff4757;
    --orange: #ff6b35;
    --yellow: #ffa502;
    --text: #e8f4f8;
    --text2: #8bacc8;
    --text3: #4a6fa5;
    --metal1: #c0d0e8;
    --metal2: #8098b8;
    --metal3: #405070;
    --shadow: 0 8px 32px rgba(0,0,0,0.5);
    --glow: 0 0 20px rgba(0,212,255,0.3);
    --glow2: 0 0 40px rgba(0,212,255,0.2);
    --radius: 12px;
    --radius2: 8px;
  }

  .app.light-mode {
    --bg: #f5f7fa;
    --bg2: #e8ecf1;
    --bg3: #dce4ed;
    --card: #ffffff;
    --card2: #f0f5fb;
    --border: #d1dae8;
    --border2: #b8c8e1;
    --accent: #0077be;
    --accent2: #004a96;
    --accent3: #008c45;
    --text: #1a1f3a;
    --text2: #475569;
    --text3: #64748b;
    --metal1: #1a1f3a;
    --metal2: #475569;
    --metal3: #94a3b8;
    --shadow: 0 4px 15px rgba(0,0,0,0.1);
    --glow: 0 0 15px rgba(0,119,190,0.2);
    --glow2: 0 0 30px rgba(0,119,190,0.15);
  }

  * { box-sizing: border-box; margin: 0; padding: 0; }

  body {
    background: var(--bg);
    color: var(--text);
    font-family: 'Exo 2', sans-serif;
    min-height: 100vh;
    overflow-x: hidden;
  }

  /* SCROLLBAR */
  ::-webkit-scrollbar { width: 6px; }
  ::-webkit-scrollbar-track { background: var(--bg2); }
  ::-webkit-scrollbar-thumb { background: var(--border2); border-radius: 3px; }

  /* PAPIWEB BRAND */
  .papiweb-brand {
    display: flex; align-items: center; gap: 10px;
    font-family: 'Rajdhani', sans-serif;
    font-weight: 700; letter-spacing: 2px;
    font-size: 11px; text-transform: uppercase;
  }
  .papiweb-logo {
    position: relative;
    background: linear-gradient(135deg, #1a2540, #0a0e1a);
    border: 1px solid var(--border2);
    border-radius: 6px;
    padding: 4px 10px;
    overflow: hidden;
  }
  .papiweb-logo::before {
    content: '';
    position: absolute; inset: 0;
    background: linear-gradient(90deg, transparent 0%, rgba(255,255,255,0.4) 50%, transparent 100%);
    animation: shineEffectMirror 2.5s ease-in-out infinite;
  }
  .papiweb-logo::after {
    content: '';
    position: absolute; top: 0; left: 0; right: 0; height: 1px;
    background: linear-gradient(90deg, transparent, var(--accent), transparent);
    animation: ledScan 2s linear infinite;
  }
  .papiweb-text {
    background: linear-gradient(135deg, #c0d0e8 0%, #ffffff 30%, #8098b8 50%, #ffffff 70%, #4a6fa5 100%);
    -webkit-background-clip: text; -webkit-text-fill-color: transparent;
    background-clip: text;
    filter: drop-shadow(0 0 6px rgba(0,212,255,0.5));
    animation: metalPulse 4s ease-in-out infinite;
  }
  .papiweb-sub {
    color: var(--text3); font-size: 9px; letter-spacing: 1px;
    font-family: 'Exo 2', sans-serif; font-weight: 300;
    text-transform: uppercase;
  }
  .led-dot {
    width: 6px; height: 6px; border-radius: 50%;
    background: var(--accent3);
    box-shadow: 0 0 8px var(--accent3), 0 0 16px var(--accent3);
    animation: ledBlink 1.5s ease-in-out infinite;
  }

  @keyframes shineEffectMirror {
    0% { transform: translateX(200%); opacity: 0; }
    25% { opacity: 1; }
    50% { transform: translateX(0%); opacity: 1; }
    75% { opacity: 1; }
    100% { transform: translateX(-200%); opacity: 0; }
  }
  @keyframes metalShine {
    0%, 100% { transform: translateX(-100%); }
    50% { transform: translateX(100%); }
  }
  @keyframes ledScan {
    0% { transform: translateX(-100%); }
    100% { transform: translateX(100%); }
  }
  @keyframes metalPulse {
    0%, 100% { filter: drop-shadow(0 0 6px rgba(0,212,255,0.5)); }
    50% { filter: drop-shadow(0 0 12px rgba(0,212,255,0.8)); }
  }
  @keyframes ledBlink {
    0%, 100% { opacity: 1; box-shadow: 0 0 8px var(--accent3), 0 0 16px var(--accent3); }
    50% { opacity: 0.4; box-shadow: 0 0 4px var(--accent3); }
  }
  @keyframes pulse {
    0%, 100% { transform: scale(1); opacity: 1; }
    50% { transform: scale(1.05); opacity: 0.8; }
  }
  @keyframes slideIn {
    from { transform: translateY(-10px); opacity: 0; }
    to { transform: translateY(0); opacity: 1; }
  }
  @keyframes fadeIn {
    from { opacity: 0; }
    to { opacity: 1; }
  }
  @keyframes scanLine {
    0% { top: 0; }
    100% { top: 100%; }
  }
  @keyframes glitch {
    0%, 100% { transform: translate(0); }
    25% { transform: translate(-2px, 1px); }
    75% { transform: translate(2px, -1px); }
  }

  /* LAYOUT */
  .app { display: flex; flex-direction: column; min-height: 100vh; }
  .header {
    background: linear-gradient(180deg, var(--bg2) 0%, var(--bg3) 100%);
    border-bottom: 1px solid var(--border);
    padding: 12px 16px;
    display: flex; align-items: center; justify-content: space-between; gap: 16px; flex-wrap: wrap;
    position: sticky; top: 0; z-index: 100;
    box-shadow: 0 4px 20px rgba(0,0,0,0.5);
  }
  .header-title {
    font-family: 'Rajdhani', sans-serif;
    font-size: 22px; font-weight: 700;
    letter-spacing: 2px; text-transform: uppercase;
    background: linear-gradient(90deg, var(--accent), #fff, var(--accent2));
    -webkit-background-clip: text; -webkit-text-fill-color: transparent;
    background-clip: text;
    filter: drop-shadow(0 0 10px rgba(0,212,255,0.4));
  }
  .header-sub { font-size: 10px; color: var(--text3); letter-spacing: 1.5px; }

  .main { display: flex; flex: 1; }
  .sidebar {
    width: 240px; min-height: calc(100vh - 61px);
    background: linear-gradient(180deg, var(--bg2), var(--bg3));
    border-right: 1px solid var(--border);
    padding: 16px 0;
    position: sticky; top: 61px; height: calc(100vh - 61px);
    overflow-y: auto;
    transition: width 0.3s ease;
  }
  .sidebar.collapsed { width: 60px; }
  .content { flex: 1; padding: 24px; overflow-y: auto; animation: fadeIn 0.3s ease; }

  /* NAV */
  .nav-item {
    display: flex; align-items: center; gap: 12px;
    padding: 10px 20px;
    cursor: pointer; transition: all 0.2s ease;
    border-left: 3px solid transparent;
    font-size: 13px; font-weight: 600; letter-spacing: 0.5px;
    color: var(--text2);
    text-transform: uppercase;
  }
  .nav-item:hover { background: rgba(0,212,255,0.05); color: var(--accent); border-left-color: var(--accent2); }
  .nav-item.active { background: rgba(0,212,255,0.1); color: var(--accent); border-left-color: var(--accent); }
  .nav-icon { font-size: 18px; min-width: 20px; text-align: center; }
  .nav-badge {
    margin-left: auto; background: var(--red); color: white;
    border-radius: 10px; padding: 1px 7px; font-size: 10px;
    animation: pulse 1.5s ease-in-out infinite;
  }
  .nav-section {
    padding: 8px 20px 4px;
    font-size: 9px; letter-spacing: 2px; color: var(--text3);
    text-transform: uppercase; font-weight: 700;
  }

  /* CARDS */
  .card {
    background: var(--card);
    border: 1px solid var(--border);
    border-radius: var(--radius);
    padding: 20px;
    box-shadow: var(--shadow);
    transition: all 0.2s ease;
    animation: slideIn 0.3s ease;
  }
  .card:hover { border-color: var(--border2); box-shadow: var(--shadow), var(--glow); }
  .card[style*="cursor: pointer"]:hover {
    transform: translateY(-4px);
    border-color: var(--accent);
    box-shadow: 0 8px 20px rgba(0, 212, 255, 0.15);
  }
  .card-header {
    display: flex; align-items: center; justify-content: space-between;
    margin-bottom: 16px; padding-bottom: 12px;
    border-bottom: 1px solid var(--border);
    flex-wrap: wrap; gap: 8px;
  }
  .card-title { font-family: 'Rajdhani', sans-serif; font-size: 16px; font-weight: 700; letter-spacing: 1px; color: var(--accent); }
  .card-grid { display: grid; grid-template-columns: repeat(auto-fill, minmax(300px, 1fr)); gap: 16px; }

  /* STATS */
  .stats-grid { display: grid; grid-template-columns: repeat(auto-fit, minmax(180px, 1fr)); gap: 16px; margin-bottom: 24px; }
  .stat-card {
    background: var(--card2);
    border: 1px solid var(--border);
    border-radius: var(--radius);
    padding: 16px 20px;
    position: relative; overflow: hidden;
    transition: all 0.2s ease;
  }
  .stat-card::before {
    content: ''; position: absolute; top: 0; left: 0; right: 0; height: 2px;
    background: var(--gradient, linear-gradient(90deg, var(--accent), var(--accent2)));
  }
  .stat-card:hover { border-color: var(--border2); transform: translateY(-2px); }
  .stat-value { font-family: 'Rajdhani', sans-serif; font-size: 36px; font-weight: 700; color: var(--accent); line-height: 1; }
  .stat-label { font-size: 11px; color: var(--text2); text-transform: uppercase; letter-spacing: 1px; margin-top: 4px; }
  .stat-icon { position: absolute; right: 16px; top: 16px; font-size: 28px; opacity: 0.2; }

  /* BADGES */
  .badge {
    display: inline-block; padding: 2px 10px; border-radius: 20px;
    font-size: 11px; font-weight: 700; letter-spacing: 0.5px;
    text-transform: uppercase;
  }
  .badge-active { background: rgba(0,255,136,0.15); color: var(--accent3); border: 1px solid rgba(0,255,136,0.3); }
  .badge-licencia { background: rgba(255,71,87,0.15); color: var(--red); border: 1px solid rgba(255,71,87,0.3); }
  .badge-titular { background: rgba(0,212,255,0.1); color: var(--accent); border: 1px solid rgba(0,212,255,0.2); }
  .badge-suplente { background: rgba(255,165,2,0.1); color: var(--yellow); border: 1px solid rgba(255,165,2,0.2); }
  .badge-interino { background: rgba(255,107,53,0.1); color: var(--orange); border: 1px solid rgba(255,107,53,0.2); }
  .badge-warning { background: rgba(255,165,2,0.15); color: var(--yellow); border: 1px solid rgba(255,165,2,0.3); }
  .badge-danger { background: rgba(255,71,87,0.15); color: var(--red); border: 1px solid rgba(255,71,87,0.3); animation: pulse 1.5s infinite; }

  /* BUTTONS */
  .btn {
    display: inline-flex; align-items: center; gap: 8px;
    padding: 8px 16px; border-radius: var(--radius2);
    font-family: 'Exo 2', sans-serif; font-size: 13px; font-weight: 600;
    cursor: pointer; border: none; transition: all 0.2s ease;
    letter-spacing: 0.5px; text-transform: uppercase;
  }
  .btn-primary {
    background: linear-gradient(135deg, var(--accent2), var(--accent));
    color: #0a0e1a;
    box-shadow: 0 4px 15px rgba(0,212,255,0.3);
  }
  .btn-primary:hover { transform: translateY(-1px); box-shadow: 0 6px 20px rgba(0,212,255,0.4); }
  .btn-secondary { background: var(--card2); color: var(--text); border: 1px solid var(--border2); }
  .btn-secondary:hover { border-color: var(--accent); color: var(--accent); }
  .btn-danger { background: rgba(255,71,87,0.2); color: var(--red); border: 1px solid rgba(255,71,87,0.3); }
  .btn-danger:hover { background: rgba(255,71,87,0.3); }
  .btn-sm { padding: 4px 10px; font-size: 11px; }
  .btn-icon { padding: 6px; border-radius: 6px; background: var(--card2); border: 1px solid var(--border); cursor: pointer; color: var(--text2); font-size: 16px; transition: all 0.2s; }
  .btn-icon:hover { border-color: var(--accent); color: var(--accent); }

  /* FORMS */
  .form-group { margin-bottom: 16px; }
  .form-label { display: block; font-size: 11px; font-weight: 600; letter-spacing: 1px; color: var(--text2); text-transform: uppercase; margin-bottom: 6px; }
  .form-input, .form-select, .form-textarea {
    width: 100%; background: var(--bg2); border: 1px solid var(--border);
    border-radius: var(--radius2); padding: 9px 14px;
    color: var(--text); font-family: 'Exo 2', sans-serif; font-size: 13px;
    transition: all 0.2s ease; outline: none;
  }
  .form-input:focus, .form-select:focus, .form-textarea:focus {
    border-color: var(--accent); box-shadow: 0 0 0 3px rgba(0,212,255,0.1);
  }
  .form-textarea { resize: vertical; min-height: 80px; }
  .form-row { display: grid; grid-template-columns: 1fr 1fr; gap: 16px; }

  /* TABLE */
  .table-wrap { overflow-x: auto; border-radius: var(--radius); }
  table { width: 100%; border-collapse: collapse; font-size: 13px; }
  th { background: var(--bg2); padding: 10px 14px; text-align: left; font-size: 10px; letter-spacing: 1.5px; color: var(--text3); text-transform: uppercase; font-weight: 700; border-bottom: 1px solid var(--border); }
  td { padding: 10px 14px; border-bottom: 1px solid rgba(30,58,95,0.5); transition: background 0.15s; }
  tr:hover td { background: rgba(0,212,255,0.03); }
  tr:last-child td { border-bottom: none; }

  /* MODAL */
  .modal-overlay {
    position: fixed; inset: 0; background: rgba(0,0,0,0.8);
    display: flex; align-items: center; justify-content: center;
    z-index: 1000; animation: fadeIn 0.2s ease;
    backdrop-filter: blur(4px);
  }
  .modal {
    background: var(--card); border: 1px solid var(--border2);
    border-radius: var(--radius); padding: 24px;
    max-width: 700px; width: 95%; max-height: 90vh; overflow-y: auto;
    box-shadow: 0 20px 60px rgba(0,0,0,0.8), var(--glow2);
    animation: slideIn 0.3s ease;
  }
  .modal-header { display: flex; justify-content: space-between; align-items: center; margin-bottom: 20px; padding-bottom: 16px; border-bottom: 1px solid var(--border); }
  .modal-title { font-family: 'Rajdhani', sans-serif; font-size: 20px; font-weight: 700; color: var(--accent); letter-spacing: 1px; }

  /* ALERTS */
  .alert {
    padding: 12px 16px; border-radius: var(--radius2); margin-bottom: 10px;
    display: flex; align-items: flex-start; gap: 12px; font-size: 13px;
    animation: slideIn 0.3s ease;
  }
  .alert-danger { background: rgba(255,71,87,0.1); border: 1px solid rgba(255,71,87,0.3); color: var(--red); }
  .alert-warning { background: rgba(255,165,2,0.1); border: 1px solid rgba(255,165,2,0.3); color: var(--yellow); }
  .alert-info { background: rgba(0,212,255,0.1); border: 1px solid rgba(0,212,255,0.2); color: var(--accent); }
  .alert-success { background: rgba(0,255,136,0.1); border: 1px solid rgba(0,255,136,0.2); color: var(--accent3); }
  .alert-icon { font-size: 18px; min-width: 20px; }

  /* CALENDAR */
  .calendar {
    background: var(--card2); border: 1px solid var(--border);
    border-radius: var(--radius); overflow: hidden;
    max-width: 300px;
  }
  .cal-header {
    background: var(--bg2); padding: 10px 14px;
    display: flex; justify-content: space-between; align-items: center;
    font-size: 13px; font-weight: 700; color: var(--accent);
  }
  .cal-grid { display: grid; grid-template-columns: repeat(7,1fr); }
  .cal-day-header { padding: 6px 4px; text-align: center; font-size: 10px; color: var(--text3); font-weight: 700; letter-spacing: 0.5px; }
  .cal-day {
    padding: 5px 4px; text-align: center; font-size: 11px; cursor: pointer;
    transition: all 0.15s; border-radius: 4px; margin: 1px;
    color: var(--text2);
  }
  .cal-day:hover { background: rgba(0,212,255,0.1); color: var(--accent); }
  .cal-day.today { background: rgba(0,212,255,0.15); color: var(--accent); font-weight: 700; }
  .cal-day.in-range { background: rgba(255,71,87,0.1); color: var(--red); }
  .cal-day.range-start, .cal-day.range-end { background: var(--red); color: white; font-weight: 700; border-radius: 50%; }
  .cal-day.other-month { opacity: 0.3; }
  .cal-day.empty { cursor: default; }

  /* CHARTS */
  .chart-bar-wrap { display: flex; flex-direction: column; gap: 8px; }
  .chart-bar-row { display: flex; align-items: center; gap: 10px; font-size: 12px; }
  .chart-bar-label { min-width: 140px; color: var(--text2); font-size: 11px; }
  .chart-bar-bg { flex: 1; height: 20px; background: var(--bg2); border-radius: 10px; overflow: hidden; position: relative; }
  .chart-bar-fill { height: 100%; border-radius: 10px; transition: width 1s ease; display: flex; align-items: center; padding-left: 8px; font-size: 10px; font-weight: 700; color: rgba(0,0,0,0.7); }
  .chart-val { min-width: 30px; text-align: right; font-weight: 700; color: var(--text); }

  /* VIEW TOGGLES */
  .view-toggle { display: flex; gap: 4px; background: var(--bg2); border: 1px solid var(--border); border-radius: 8px; padding: 4px; }
  .view-btn { padding: 5px 14px; border-radius: 6px; cursor: pointer; font-size: 11px; font-weight: 600; letter-spacing: 0.5px; transition: all 0.2s; color: var(--text2); background: none; border: none; text-transform: uppercase; }
  .view-btn.active { background: var(--card2); color: var(--accent); border: 1px solid var(--border2); }

  /* SCHOOL CARD */
  .school-card {
    background: var(--card); border: 1px solid var(--border);
    border-radius: var(--radius); overflow: hidden; transition: all 0.2s ease;
    animation: slideIn 0.3s ease;
  }
  .school-card:hover { border-color: var(--border2); box-shadow: var(--shadow), var(--glow); }
  .school-card-header {
    padding: 16px 20px; background: linear-gradient(135deg, var(--card2), var(--card));
    border-bottom: 1px solid var(--border);
    cursor: pointer;
  }
  .school-card-body { padding: 16px 20px; }
  .school-de { font-size: 10px; color: var(--accent); letter-spacing: 2px; font-weight: 700; text-transform: uppercase; }
  .school-name { font-family: 'Rajdhani', sans-serif; font-size: 18px; font-weight: 700; margin: 4px 0; }
  .school-meta { display: flex; gap: 12px; flex-wrap: wrap; margin-top: 6px; }
  .school-meta-item { font-size: 11px; color: var(--text2); display: flex; align-items: center; gap: 4px; }
  .school-info-grid { display: grid; grid-template-columns: 1fr 1fr; gap: 12px; font-size: 12px; }
  .school-info-label { font-size: 10px; color: var(--text3); letter-spacing: 1px; text-transform: uppercase; font-weight: 700; }
  .school-info-val { color: var(--text); margin-top: 2px; }

  /* DOCENTE */
  .docente-row {
    background: var(--card2); border: 1px solid var(--border);
    border-radius: var(--radius2); padding: 14px 16px; margin-bottom: 10px;
    transition: all 0.2s;
    position: relative;
  }
  .docente-row:hover { border-color: var(--border2); }
  .docente-row.suplente-row { margin-left: 24px; border-left: 3px solid var(--yellow); }
  .docente-header { display: flex; align-items: center; gap: 10px; flex-wrap: wrap; }
  .docente-name { font-family: 'Rajdhani', sans-serif; font-size: 16px; font-weight: 700; color: var(--text); }
  .docente-details { display: grid; grid-template-columns: repeat(auto-fit, minmax(180px, 1fr)); gap: 8px; margin-top: 10px; font-size: 12px; }
  .detail-item { }
  .detail-label { font-size: 10px; color: var(--text3); text-transform: uppercase; letter-spacing: 1px; }
  .detail-val { color: var(--text2); margin-top: 2px; }

  /* DAYS REMAINING */
  .days-remaining {
    display: inline-flex; align-items: center; gap: 6px;
    padding: 4px 10px; border-radius: 20px; font-size: 11px; font-weight: 700;
  }
  .days-ok { background: rgba(0,255,136,0.1); color: var(--accent3); border: 1px solid rgba(0,255,136,0.2); }
  .days-warn { background: rgba(255,165,2,0.15); color: var(--yellow); border: 1px solid rgba(255,165,2,0.3); animation: pulse 2s infinite; }
  .days-danger { background: rgba(255,71,87,0.15); color: var(--red); border: 1px solid rgba(255,71,87,0.3); animation: pulse 1s infinite; }

  /* LOGIN */
  .login-container {
    min-height: 100vh; display: flex; align-items: center; justify-content: center;
    background: #080b12; /* Darker navy background to match image */
  }
  .login-box {
    background: transparent;
    border: 1px solid rgba(0,212,255,0.15); /* Very subtle border */
    border-radius: var(--radius); padding: 40px;
    width: 360px; position: relative;
    box-shadow: inset 0 0 40px rgba(0,212,255,0.02);
    animation: fadeIn 0.4s ease;
  }
  
  .login-logo-container {
    display: flex; justify-content: center; margin-bottom: 24px;
  }
  .login-logo-container .papiweb-logo {
     background: transparent;
     border: 1px solid rgba(0,212,255,0.1);
     padding: 10px 40px;
  }
  .login-logo-container .papiweb-text {
     font-size: 16px; letter-spacing: 1.5px;
     text-align: center;
     background: #fff;
     -webkit-background-clip: text; -webkit-text-fill-color: transparent;
     background-clip: text;
     filter: none; animation: none;
  }
  .login-logo-container .papiweb-sub {
     color: rgba(0,212,255,0.6);
     font-size: 8px;
     letter-spacing: 0.5px;
     margin-top: 4px;
     text-align: center;
  }

  .login-title { font-family: 'Rajdhani', sans-serif; font-size: 24px; font-weight: 700; letter-spacing: 1px; text-transform: uppercase; color: var(--accent); margin-bottom: 8px; }
  .login-sub { font-size: 10px; color: var(--text3); letter-spacing: 1px; text-transform: uppercase; }
  
  .login-label {
      font-size: 9px;
      color: rgba(255,255,255,0.6);
      margin-bottom: 4px;
  }
  .login-input {
      background: transparent !important;
      border: 1px solid rgba(0,212,255,0.2) !important;
      color: rgba(255,255,255,0.9) !important;
  }
  .login-input:focus {
      border-color: rgba(0,212,255,0.5) !important;
      box-shadow: 0 0 10px rgba(0,212,255,0.1) !important;
  }
  
  .login-btn {
      width: 100%;
      justify-content: center;
      padding: 12px;
      background: linear-gradient(90deg, #00d4ff, #0088cc);
      box-shadow: 0 0 20px rgba(0,212,255,0.4);
      border: none;
      color: #000;
      font-weight: 700;
  }
  .login-btn:hover {
      box-shadow: 0 0 30px rgba(0,212,255,0.6);
  }

  .login-demo-text {
      font-size: 10px;
      color: rgba(255,255,255,0.3);
      text-align: center;
      margin-top: 24px;
  }

  /* PDF EXPORT */
  .pdf-preview {
    background: white; color: #111; border-radius: 8px;
    padding: 24px; font-family: sans-serif; font-size: 12px;
    max-height: 400px; overflow-y: auto;
  }
  .pdf-header { border-bottom: 2px solid #0099cc; padding-bottom: 10px; margin-bottom: 14px; }
  .pdf-title { font-size: 18px; font-weight: 700; color: #0066aa; }
  .pdf-sub { font-size: 10px; color: #666; margin-top: 2px; }

  /* MISC */
  .flex { display: flex; }
  .flex-col { display: flex; flex-direction: column; }
  .gap-4 { gap: 4px; }
  .gap-8 { gap: 8px; }
  .gap-12 { gap: 12px; }
  .gap-16 { gap: 16px; }
  .items-center { align-items: center; }
  .justify-between { justify-content: space-between; }
  .justify-end { justify-content: flex-end; }
  .flex-wrap { flex-wrap: wrap; }
  .mb-8 { margin-bottom: 8px; }
  .mb-16 { margin-bottom: 16px; }
  .mb-24 { margin-bottom: 24px; }
  .mt-8 { margin-top: 8px; }
  .mt-16 { margin-top: 16px; }
  .text-sm { font-size: 12px; }
  .text-xs { font-size: 11px; }
  .text-accent { color: var(--accent); }
  .text-muted { color: var(--text2); }
  .text-danger { color: var(--red); }
  .text-success { color: var(--accent3); }
  .text-warn { color: var(--yellow); }
  .clickable { cursor: pointer; transition: color 0.15s; }
  .clickable:hover { color: var(--accent); }
  .link { color: var(--accent); text-decoration: underline; cursor: pointer; }
  .link:hover { color: var(--accent2); }
  .divider { border: none; border-top: 1px solid var(--border); margin: 16px 0; }
  .tag { display: inline-block; padding: 2px 8px; border-radius: 4px; font-size: 10px; font-weight: 700; letter-spacing: 0.5px; }
  .no-data { text-align: center; padding: 40px; color: var(--text3); }
  .search-input-wrap { position: relative; }
  .search-input-wrap .search-icon { position: absolute; left: 10px; top: 50%; transform: translateY(-50%); color: var(--text3); font-size: 14px; pointer-events: none; }
  .search-input-wrap .form-input { padding-left: 32px; }

  @media (max-width: 1024px) {
    .header { flex-direction: column; align-items: flex-start; }
    .header .search-input-wrap { width: 100%; }
    .header > div:last-child { width: 100%; justify-content: space-between; }
    .content { padding: 16px; }
    .card-grid { grid-template-columns: repeat(auto-fill, minmax(280px, 1fr)); }
  }

  @media (max-width: 768px) {
    .header { flex-direction: column; gap: 8px; padding: 8px 12px; }
    .header .search-input-wrap { width: 100%; }
    .sidebar { display: none; }
    .content { padding: 12px; }
    .form-row { grid-template-columns: 1fr; }
    .stats-grid { grid-template-columns: 1fr; }
    .card-grid { grid-template-columns: 1fr; }
    .school-info-grid { grid-template-columns: 1fr; }
    .modal { width: 90vw; max-height: 85vh; padding: 16px; }
    .view-toggle { width: 100%; }
    .docente-details { grid-template-columns: 1fr; }
    .papiweb-brand { display: none; }
    .school-meta { flex-direction: column; gap: 8px; }
    .header-title { font-size: 16px; letter-spacing: 1px; }
    .modal-title { font-size: 18px; }
  }
  
  @media (max-width: 480px) {
    .header { padding: 8px 12px; gap: 6px; }
    .header-title { font-size: 14px; }
    .header-sub { font-size: 8px; }
    .header > div:first-child { width: 100%; }
    .header > div:last-child { width: 100%; flex-wrap: wrap; gap: 4px; }
    h1 { font-size: 18px !important; }
    .content { padding: 8px; }
    .card { padding: 12px; }
    .school-card-body { padding: 12px; }
    .school-card-header { padding: 12px; }
    .form-input, .form-select, .form-textarea { font-size: 12px; padding: 8px 12px; }
    .btn { padding: 6px 12px; font-size: 11px; }
    .btn-sm { padding: 4px 8px; font-size: 10px; }
    .btn-icon { padding: 5px; font-size: 14px; }
    .nav-item { padding: 8px 12px; font-size: 11px; }
    .stat-value { font-size: 24px; }
    .stat-label { font-size: 10px; }
    .stat-card { padding: 12px 16px; }
    .modal { width: 95vw; max-height: 90vh; padding: 12px; }
    .modal-header { flex-direction: column; align-items: flex-start; gap: 8px; }
    .modal-title { font-size: 16px; }
    .table-wrap { font-size: 11px; }
    th, td { padding: 6px 8px; font-size: 11px; }
    .docente-name { font-size: 14px; }
    .docente-details { font-size: 11px; }
    .search-icon { font-size: 12px; left: 8px; }
    .search-input-wrap .form-input { padding-left: 28px; font-size: 12px; }
    .flex-wrap { flex-wrap: wrap; }
    .form-label { font-size: 10px; }
    .school-name { font-size: 16px; }
    .school-de { font-size: 9px; }
    .school-meta-item { font-size: 10px; }
  }
`;

export default STYLES;