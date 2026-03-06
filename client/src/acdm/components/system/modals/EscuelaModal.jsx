import { useState } from "react";
import { GenericFormModal } from "../forms/modals/GenericFormModal";
import { useDevAutofill } from "../../../hooks/useDevAutofill";

// ============================================================
// SCHOOL FORM MODAL (Delegates to GenericFormModal)
// ============================================================
export function EscuelaModal({ escuela, isNew, onSave, onClose, isDeveloper }) {
    const [saving, setSaving] = useState(false);
    const { getEscuela } = useDevAutofill();

    // Configuración base de una escuela vacía
    const initialValues = escuela || {
        de: "",
        escuela: "",
        nivel: "Primario",
        direccion: "",
        lat: null,
        lng: null,
        telefonos: [""],
        mail: "",
        jornada: "Completa",
        turno: "Mañana",
        alumnos: [],
        docentes: []
    };

    const schema = [
        [
            { name: 'de', label: 'Distrito Escolar (DE)', type: 'text', placeholder: 'Ej: DE 01' },
            { name: 'nivel', label: 'Nivel', type: 'select', options: ['Inicial', 'Primario', 'Secundario', 'Especial'] }
        ],
        { name: 'escuela', label: 'Nombre de la Escuela', type: 'text', placeholder: 'Ej: Escuela N°1 ...' },
        { name: 'direccion', label: 'Dirección', type: 'text', placeholder: 'Calle, número, localidad' },
        [
            { name: 'lat', label: 'Latitud (opcional)', type: 'number', placeholder: '-34.603' },
            { name: 'lng', label: 'Longitud (opcional)', type: 'number', placeholder: '-58.381' }
        ],
        { name: 'mail', label: 'Mail Institucional', type: 'email', placeholder: 'escuela@bue.edu.ar' },
        [
            { name: 'jornada', label: 'Jornada', type: 'select', options: ['Simple', 'Completa', 'Extendida'] },
            { name: 'turno', label: 'Turno', type: 'select', options: ['Mañana', 'Tarde', 'Vespertino', 'Completo', 'Noche'] }
        ],
        { name: 'telefonos', label: 'Teléfonos', type: 'array_text', placeholder: '011-XXXX-XXXX', itemName: 'teléfono' }
    ];

    const handleSubmit = async (formData) => {
        if (saving) return;
        setSaving(true);
        try {
            const payload = isNew
                ? formData
                : {
                    ...formData,
                    id: formData?.id || escuela?.id,
                    _id: formData?._id || escuela?._id
                };
            await onSave(payload);
            onClose();
        } catch (error) {
            // Si quieres mostrar un alert en error, lo mejor es integrarlo al parent handleSave
            alert(error?.message || "No se pudo guardar la escuela");
        } finally {
            setSaving(false);
        }
    };

    return (
        <GenericFormModal
            isOpen={true}
            onClose={onClose}
            title={isNew ? "➕ Nueva Escuela" : "✏️ Editar Escuela"}
            schema={schema}
            initialValues={initialValues}
            onSubmit={handleSubmit}
            isSubmitting={saving}
            devAutofillData={isDeveloper ? getEscuela() : null}
        />
    );
}
