const { request } = require('@playwright/test');

module.exports = async () => {
  const apiUrl = process.env.E2E_API_URL || 'http://localhost:5000';
  const ctx = await request.newContext({ baseURL: apiUrl });

  try {
    const res = await ctx.get('/health');
    if (res.status() !== 200) {
      throw new Error(`Health check no disponible: ${res.status()}`);
    }
  } finally {
    await ctx.dispose();
  }
};
