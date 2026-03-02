const Escuela = require('../../../models/Escuela');
const Docente = require('../../../models/Docente');
const Alumno = require('../../../models/Alumno');

class SuggestionStrategy {
  async suggest() {
    throw new Error('suggest() must be implemented by strategy');
  }
}

class EscuelaSuggestionStrategy extends SuggestionStrategy {
  async suggest(query, limit) {
    const rows = await Escuela.find({
      $or: [
        { escuela: { $regex: query, $options: 'i' } },
        { de: { $regex: query, $options: 'i' } },
        { direccion: { $regex: query, $options: 'i' } }
      ]
    })
      .select('escuela de direccion')
      .limit(limit)
      .lean();

    return rows.map((row) => ({
      id: row._id,
      value: row.escuela,
      subtitle: `${row.de} - ${row.direccion}`
    }));
  }
}

class DocenteSuggestionStrategy extends SuggestionStrategy {
  async suggest(query, limit) {
    const rows = await Docente.find({
      $or: [
        { nombre: { $regex: query, $options: 'i' } },
        { apellido: { $regex: query, $options: 'i' } },
        { dni: { $regex: query, $options: 'i' } }
      ]
    })
      .select('nombre apellido dni')
      .limit(limit)
      .lean();

    return rows.map((row) => ({
      id: row._id,
      value: `${row.apellido}, ${row.nombre}`,
      subtitle: `DNI ${row.dni || '-'}`
    }));
  }
}

class AlumnoSuggestionStrategy extends SuggestionStrategy {
  async suggest(query, limit) {
    const rows = await Alumno.find({
      $or: [
        { nombre: { $regex: query, $options: 'i' } },
        { apellido: { $regex: query, $options: 'i' } },
        { dni: { $regex: query, $options: 'i' } }
      ]
    })
      .select('nombre apellido dni gradoSalaAnio')
      .limit(limit)
      .lean();

    return rows.map((row) => ({
      id: row._id,
      value: `${row.apellido}, ${row.nombre}`,
      subtitle: `${row.gradoSalaAnio || '-'} | DNI ${row.dni || '-'}`
    }));
  }
}

class EmptySuggestionStrategy extends SuggestionStrategy {
  async suggest() {
    return [];
  }
}

const strategyMap = {
  escuelas: new EscuelaSuggestionStrategy(),
  docentes: new DocenteSuggestionStrategy(),
  alumnos: new AlumnoSuggestionStrategy(),
  none: new EmptySuggestionStrategy()
};

const resolveSuggestionStrategy = (source = 'none') => strategyMap[source] || strategyMap.none;

module.exports = {
  resolveSuggestionStrategy
};
