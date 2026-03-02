/**
 * Ejemplo de uso del GenericTable con conectividad a API
 * Este archivo muestra cómo integrar tablas con sincronización de servidor
 */

import { GenericTable } from '../components/GenericTable';
import { acdmApi } from '../services/acdmApi';

/**
 * Ejemplo 1: Tabla de Escuelas con sincronización a API
 */
export function EscuelasTableWithAPI({ escuelas, onAddEscuela, onUpdateEscuela, onDeleteEscuela }) {
  const columns = [
    { key: 'de', label: 'D.E.' },
    { key: 'escuela', label: 'Escuela' },
    { key: 'nivel', label: 'Nivel', type: 'select', options: ['Inicial', 'Primario', 'Secundario'] },
    { key: 'mail', label: 'Email', type: 'email' },
    { key: 'alumnos', label: 'Alumnos', render: (alumnos) => alumnos?.length || 0 },
  ];

  return (
    <GenericTable
      title="🏫 Escuelas"
      columns={columns}
      data={escuelas}
      onAdd={async (data) => {
        try {
          await acdmApi.createEscuela(data);
          onAddEscuela(data);
        } catch (error) {
          console.error('Error al agregar escuela:', error);
          throw error;
        }
      }}
      onEdit={async (id, data) => {
        try {
          await acdmApi.updateEscuela(id, data);
          onUpdateEscuela(id, data);
        } catch (error) {
          console.error('Error al actualizar escuela:', error);
          throw error;
        }
      }}
      onDelete={async (id) => {
        try {
          await acdmApi.deleteEscuela(id);
          onDeleteEscuela(id);
        } catch (error) {
          console.error('Error al eliminar escuela:', error);
          throw error;
        }
      }}
      onFetch={async () => {
        try {
          const result = await acdmApi.getEscuelas();
          return result.data || result;
        } catch (error) {
          console.error('Error fetching escuelas:', error);
          throw error;
        }
      }}
      enableRemoteSync={true}
      itemsPerPage={15}
    />
  );
}

/**
 * Ejemplo 2: Tabla de Visitas con sincronización a API
 */
export function VisitasTableWithAPI({ escuela, onAddVisita, onUpdateVisita, onDeleteVisita }) {
  const columns = [
    { key: 'fecha', label: 'Fecha', type: 'date' },
    { key: 'visitante', label: 'Visitante' },
    { key: 'observaciones', label: 'Observaciones', type: 'textarea' },
  ];

  return (
    <GenericTable
      title={`👁️ Visitas - ${escuela.escuela}`}
      columns={columns}
      data={escuela.visitas || []}
      onAdd={async (data) => {
        try {
          await acdmApi.createVisita(escuela.id, data);
          onAddVisita(escuela.id, data);
        } catch (error) {
          console.error('Error al agregar visita:', error);
          throw error;
        }
      }}
      onEdit={async (id, data) => {
        try {
          await acdmApi.updateVisita(escuela.id, id, data);
          onUpdateVisita(escuela.id, id, data);
        } catch (error) {
          console.error('Error al actualizar visita:', error);
          throw error;
        }
      }}
      onDelete={async (id) => {
        try {
          await acdmApi.deleteVisita(escuela.id, id);
          onDeleteVisita(escuela.id, id);
        } catch (error) {
          console.error('Error al eliminar visita:', error);
          throw error;
        }
      }}
      onFetch={async () => {
        try {
          const result = await acdmApi.getVisitas(escuela.id);
          return result.data || result;
        } catch (error) {
          console.error('Error fetching visitas:', error);
          throw error;
        }
      }}
      enableRemoteSync={true}
      itemsPerPage={20}
    />
  );
}

/**
 * Ejemplo 3: Tabla de Proyectos con sincronización a API
 */
export function ProyectosTableWithAPI({ escuela, onAddProyecto, onUpdateProyecto, onDeleteProyecto }) {
  const columns = [
    { key: 'nombre', label: 'Nombre' },
    { key: 'estado', label: 'Estado', type: 'select', options: ['Completado', 'En Progreso', 'Pendiente', 'Cancelado'] },
    { key: 'descripcion', label: 'Descripción', type: 'textarea' },
    { key: 'fechaInicio', label: 'Inicio', type: 'date' },
    { key: 'fechaBaja', label: 'Cierre', type: 'date' },
  ];

  return (
    <GenericTable
      title={`📦 Proyectos - ${escuela.escuela}`}
      columns={columns}
      data={escuela.proyectos || []}
      onAdd={async (data) => {
        try {
          await acdmApi.createProyecto(escuela.id, data);
          onAddProyecto(escuela.id, data);
        } catch (error) {
          console.error('Error al agregar proyecto:', error);
          throw error;
        }
      }}
      onEdit={async (id, data) => {
        try {
          await acdmApi.updateProyecto(escuela.id, id, data);
          onUpdateProyecto(escuela.id, id, data);
        } catch (error) {
          console.error('Error al actualizar proyecto:', error);
          throw error;
        }
      }}
      onDelete={async (id) => {
        try {
          await acdmApi.deleteProyecto(escuela.id, id);
          onDeleteProyecto(escuela.id, id);
        } catch (error) {
          console.error('Error al eliminar proyecto:', error);
          throw error;
        }
      }}
      onFetch={async () => {
        try {
          const result = await acdmApi.getProyectos(escuela.id);
          return result.data || result;
        } catch (error) {
          console.error('Error fetching proyectos:', error);
          throw error;
        }
      }}
      enableRemoteSync={true}
      itemsPerPage={20}
    />
  );
}

/**
 * Ejemplo 4: Tabla de Informes con sincronización a API
 */
export function InformesTableWithAPI({ escuela, onAddInforme, onUpdateInforme, onDeleteInforme }) {
  const columns = [
    { key: 'titulo', label: 'Título' },
    { key: 'estado', label: 'Estado', type: 'select', options: ['Pendiente', 'En Revisión', 'Entregado', 'Rechazado'] },
    { key: 'fechaEntrega', label: 'Fecha Entrega', type: 'date' },
    { key: 'observaciones', label: 'Observaciones', type: 'textarea' },
  ];

  return (
    <GenericTable
      title={`📋 Informes - ${escuela.escuela}`}
      columns={columns}
      data={escuela.informes || []}
      onAdd={async (data) => {
        try {
          await acdmApi.createInforme(escuela.id, data);
          onAddInforme(escuela.id, data);
        } catch (error) {
          console.error('Error al agregar informe:', error);
          throw error;
        }
      }}
      onEdit={async (id, data) => {
        try {
          await acdmApi.updateInforme(escuela.id, id, data);
          onUpdateInforme(escuela.id, id, data);
        } catch (error) {
          console.error('Error al actualizar informe:', error);
          throw error;
        }
      }}
      onDelete={async (id) => {
        try {
          await acdmApi.deleteInforme(escuela.id, id);
          onDeleteInforme(escuela.id, id);
        } catch (error) {
          console.error('Error al eliminar informe:', error);
          throw error;
        }
      }}
      onFetch={async () => {
        try {
          const result = await acdmApi.getInformes(escuela.id);
          return result.data || result;
        } catch (error) {
          console.error('Error fetching informes:', error);
          throw error;
        }
      }}
      enableRemoteSync={true}
      itemsPerPage={20}
    />
  );
}
