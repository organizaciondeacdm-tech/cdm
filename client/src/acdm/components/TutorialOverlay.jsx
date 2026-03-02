const steps = [
  'Elegí una plantilla para cargar datos rápidamente.',
  'Completá campos con autocompletado y sugerencias.',
  'Guardá con actualización optimista y sincronización batch.',
  'Filtrá la tabla por columna para validar resultados.'
];

export function TutorialOverlay({ enabled, stepIndex, setStepIndex, close }) {
  if (!enabled) return null;

  const isLast = stepIndex >= steps.length - 1;

  return (
    <div className="tutorial-overlay">
      <div className="tutorial-modal fade-in">
        <h3>Modo tutorial</h3>
        <p>{steps[stepIndex]}</p>
        <div className="actions">
          <button type="button" onClick={close}>Cerrar</button>
          {!isLast && <button type="button" onClick={() => setStepIndex((n) => n + 1)}>Siguiente</button>}
          {isLast && <button type="button" onClick={close}>Finalizar</button>}
        </div>
      </div>
    </div>
  );
}
