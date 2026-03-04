const fs = require('fs');

function addDebug(file) {
  let content = fs.readFileSync(file, 'utf8');
  content = content.replace(/expect\(res\.status\(\), `fallo en \${path}`\)\.toBe\(expected\);/g, 
    "if (res.status() !== expected) { console.error(`Failed ${path}: [${res.status()}]`, await res.text()); }\n      expect(res.status(), `fallo en ${path}`).toBe(expected);");
  content = content.replace(/expect\(\(await api\.get\('\/api\/alumnos\/estadisticas', \{ headers \}\)\)\.status\(\)\)\.toBe\(200\);/g,
    "const stRes = await api.get('/api/alumnos/estadisticas', { headers }); if (stRes.status() !== 200) console.error('Estadisticas fail:', await stRes.text()); expect(stRes.status()).toBe(200);");
  fs.writeFileSync(file, content);
}

addDebug('tests/e2e/02-protected-resources.spec.js');
addDebug('tests/e2e/03-forms-and-admin.spec.js');
