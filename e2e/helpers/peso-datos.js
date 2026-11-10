// Copia de prueba con pesajes y un objetivo (F11.2).
//
// La tarjeta del último pesaje solo existe cuando hay historial, así que las
// auditorías de diseño y de contraste la miden restaurando esta copia por el
// camino real (Ajustes → archivo). Sin ella, /weight se quedaba en su estado
// vacío y la gráfica, sus etiquetas y la cifra grande no se medían nunca.

const { restoreBackup } = require('./backup');

const GOAL_KG = 75;

const ISO = (days) => {
  const d = new Date();
  d.setHours(12, 0, 0, 0);
  d.setDate(d.getDate() - days);
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, '0');
  const day = String(d.getDate()).padStart(2, '0');
  return `${y}-${m}-${day}`;
};

// Diez pesajes repartidos en cuatro semanas, de 80,1 a 76,0 kg: la gráfica
// tiene mínimo, máximo y una tendencia real que cruza el objetivo.
const SERIE = [
  [27, 80.1], [24, 79.8], [21, 79.2], [18, 79.0], [15, 78.4],
  [12, 77.9], [9, 77.5], [6, 77.1], [3, 76.4], [0, 76.0],
];

function backupPesoConDatos() {
  const weights = SERIE.map(([days, weight], i) => {
    const date = ISO(days);
    return {
      id: `diseno-wt-${i}`,
      clientId: 'e2e',
      ownerUserId: 'e2e-user-id',
      createdAt: `${date}T07:00:00.000Z`,
      modifiedAt: `${date}T07:00:00.000Z`,
      version: 1,
      weight,
      date,
    };
  });

  return {
    app: 'FORTIXAM',
    version: '8.5.56',
    exportedAt: new Date().toISOString(),
    user: { id: 'e2e-user-id', username: 'E2E', email: 'e2e@fortixam.local' },
    sessions: [],
    weights,
    lastExerciseWeights: {},
  };
}

/**
 * Deja la app con pesajes y objetivo fijado, lista para abrir /weight.
 * Debe llamarse después de `seedSession` y antes de navegar a la pantalla.
 */
async function restaurarPesoConDatos(page) {
  // El objetivo entra en el dominio de la gráfica para que se pinte su línea
  // y su etiqueta, que también tienen que pasar el contraste.
  await page.addInitScript((goal) => {
    localStorage.setItem('fortixam_weight_goals_v1', JSON.stringify({ 'e2e-user-id': goal }));
  }, GOAL_KG);
  await restoreBackup(page, backupPesoConDatos());
}

module.exports = { GOAL_KG, backupPesoConDatos, restaurarPesoConDatos };
