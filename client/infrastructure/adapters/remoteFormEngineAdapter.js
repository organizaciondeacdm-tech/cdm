import { httpRequest } from '../httpClient';

export class RemoteFormEngineAdapter {
  async listTemplates() {
    const response = await httpRequest('/templates');
    return response.data;
  }

  async listSubmissions(params = {}) {
    const query = new URLSearchParams(params);
    const response = await httpRequest(`/submissions?${query.toString()}`);
    return response.data;
  }

  async createSubmission(payload) {
    const response = await httpRequest('/submissions', {
      method: 'POST',
      body: JSON.stringify(payload)
    });
    return response.data;
  }

  async updateSubmission(id, payload) {
    const response = await httpRequest(`/submissions/${id}`, {
      method: 'PUT',
      body: JSON.stringify(payload)
    });
    return response.data;
  }

  async deleteSubmission(id) {
    const response = await httpRequest(`/submissions/${id}`, { method: 'DELETE' });
    return response;
  }

  async bulkCreateSubmissions(submissions) {
    const response = await httpRequest('/submissions/bulk', {
      method: 'POST',
      body: JSON.stringify({ submissions })
    });
    return response.data;
  }

  async getSuggestions(source, q) {
    const query = new URLSearchParams({ source, q, limit: '6' });
    const response = await httpRequest(`/suggestions?${query.toString()}`);
    return response.data;
  }
}
