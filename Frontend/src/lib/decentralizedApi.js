import { apiGet, apiPost, apiPut, apiDelete } from './axios';
import { createLogger } from './logger';

const logger = createLogger('decentralizedApi');

/**
 * Streams API
 */
export const fetchStreams = async (params = {}) => {
  try {
    const response = await apiGet('/streams', { params });
    return response;
  } catch (error) {
    logger.error('Error fetching streams', error);
    return { ok: false, error: error.message, items: [] };
  }
};

export const fetchStream = async (id) => {
  try {
    const response = await apiGet(`/streams/${id}`);
    return response;
  } catch (error) {
    logger.error('Error fetching stream', error);
    return { ok: false, error: error.message };
  }
};

export const createStream = async (data) => {
  try {
    const response = await apiPost('/streams', data);
    return response;
  } catch (error) {
    logger.error('Error creating stream', error);
    return { ok: false, error: error.message };
  }
};

export const updateStream = async (id, data) => {
  try {
    const response = await apiPut(`/streams/${id}`, data);
    return response;
  } catch (error) {
    logger.error('Error updating stream', error);
    return { ok: false, error: error.message };
  }
};

export const deleteStream = async (id) => {
  try {
    const response = await apiDelete(`/streams/${id}`);
    return response;
  } catch (error) {
    logger.error('Error deleting stream', error);
    return { ok: false, error: error.message };
  }
};

/**
 * Journal API
 */
export const fetchJournalEntries = async (params = {}) => {
  try {
    const response = await apiGet('/journal', { params });
    return response;
  } catch (error) {
    logger.error('Error fetching journal entries', error);
    return { ok: false, error: error.message, items: [] };
  }
};

export const fetchJournalEntry = async (id) => {
  try {
    const response = await apiGet(`/journal/${id}`);
    return response;
  } catch (error) {
    logger.error('Error fetching journal entry', error);
    return { ok: false, error: error.message };
  }
};

export const createJournalEntry = async (data) => {
  try {
    const response = await apiPost('/journal', data);
    return response;
  } catch (error) {
    logger.error('Error creating journal entry', error);
    return { ok: false, error: error.message };
  }
};

export const updateJournalEntry = async (id, data) => {
  try {
    const response = await apiPut(`/journal/${id}`, data);
    return response;
  } catch (error) {
    logger.error('Error updating journal entry', error);
    return { ok: false, error: error.message };
  }
};

export const deleteJournalEntry = async (id) => {
  try {
    const response = await apiDelete(`/journal/${id}`);
    return response;
  } catch (error) {
    logger.error('Error deleting journal entry', error);
    return { ok: false, error: error.message };
  }
};

/**
 * DID (Decentralized Identity) API
 */
export const fetchDID = async () => {
  try {
    const response = await apiGet('/did');
    return response;
  } catch (error) {
    logger.error('Error fetching DID', error);
    return { ok: false, error: error.message };
  }
};

export const createDID = async (data = {}) => {
  try {
    const response = await apiPost('/did', data);
    return response;
  } catch (error) {
    logger.error('Error creating DID', error);
    return { ok: false, error: error.message };
  }
};

export const updateDID = async (data) => {
  try {
    const response = await apiPut('/did', data);
    return response;
  } catch (error) {
    logger.error('Error updating DID', error);
    return { ok: false, error: error.message };
  }
};

/**
 * Custom Databases API
 */
export const fetchDatabases = async () => {
  try {
    const response = await apiGet('/databases');
    return response;
  } catch (error) {
    logger.error('Error fetching databases', error);
    return { ok: false, error: error.message, items: [] };
  }
};

export const fetchDatabase = async (id) => {
  try {
    const response = await apiGet(`/databases/${id}`);
    return response;
  } catch (error) {
    logger.error('Error fetching database', error);
    return { ok: false, error: error.message };
  }
};

export const createDatabase = async (data) => {
  try {
    const response = await apiPost('/databases', data);
    return response;
  } catch (error) {
    logger.error('Error creating database', error);
    return { ok: false, error: error.message };
  }
};

export const updateDatabase = async (id, data) => {
  try {
    const response = await apiPut(`/databases/${id}`, data);
    return response;
  } catch (error) {
    logger.error('Error updating database', error);
    return { ok: false, error: error.message };
  }
};

export const deleteDatabase = async (id) => {
  try {
    const response = await apiDelete(`/databases/${id}`);
    return response;
  } catch (error) {
    logger.error('Error deleting database', error);
    return { ok: false, error: error.message };
  }
};

export const addDatabaseEntry = async (databaseId, data) => {
  try {
    const response = await apiPost(`/databases/${databaseId}/entries`, data);
    return response;
  } catch (error) {
    logger.error('Error adding database entry', error);
    return { ok: false, error: error.message };
  }
};

export const deleteDatabaseEntry = async (databaseId, entryId) => {
  try {
    const response = await apiDelete(`/databases/${databaseId}/entries/${entryId}`);
    return response;
  } catch (error) {
    logger.error('Error deleting database entry', error);
    return { ok: false, error: error.message };
  }
};
