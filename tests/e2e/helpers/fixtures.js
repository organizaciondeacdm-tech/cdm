const base = require('@playwright/test');
const {
  createApiContext,
  getSession,
  createAuthHeaders,
  createSessionKit
} = require('./api');

const test = base.test.extend({
  api: async ({}, use) => {
    const context = await createApiContext(base.request);
    try {
      await use(context);
    } finally {
      await context.dispose();
    }
  },

  session: async ({ api }, use) => {
    const session = await getSession(api);
    await use(session);
  },

  authHeaders: async ({ api }, use) => {
    const { headers } = await createAuthHeaders(api);
    await use(headers);
  },

  sessionKit: async ({ api }, use) => {
    const kit = await createSessionKit(api);
    await use(kit);
  }
});

module.exports = {
  test,
  expect: base.expect
};
