/**
 * PlexCode — Files Module (Supabase CRUD)
 */

import supabase from '../supabase.js';

/**
 * Fetch all files for a user, ordered by last updated.
 * @param {string} userId
 * @returns {Promise<Array>}
 */
export async function fetchFiles(userId) {
  const { data, error } = await supabase
    .from('files')
    .select('*')
    .eq('user_id', userId)
    .order('updated_at', { ascending: false });

  if (error) { console.error('fetchFiles error:', error); return []; }
  return data || [];
}

/**
 * Fetch a single file by ID.
 * @param {string} fileId
 * @returns {Promise<object|null>}
 */
export async function fetchFile(fileId) {
  const { data, error } = await supabase
    .from('files')
    .select('*')
    .eq('id', fileId)
    .single();
  if (error) { console.error('fetchFile error:', error); return null; }
  return data;
}

/**
 * Create a new file in the cloud.
 * @param {string} userId
 * @param {{ filename: string, language: string, content: string }} opts
 * @returns {Promise<object|null>}
 */
export async function createFile(userId, { filename, language, content }) {
  const { data, error } = await supabase
    .from('files')
    .insert({ user_id: userId, filename, language, content })
    .select()
    .single();
  if (error) { console.error('createFile error:', error); return null; }
  return data;
}

/**
 * Save (upsert) file content to the cloud.
 * @param {string} fileId
 * @param {string} content
 * @returns {Promise<boolean>}
 */
export async function saveFile(fileId, content) {
  const { error } = await supabase
    .from('files')
    .update({ content, updated_at: new Date().toISOString() })
    .eq('id', fileId);
  if (error) { console.error('saveFile error:', error); return false; }
  return true;
}

/**
 * Rename a file.
 * @param {string} fileId
 * @param {string} filename
 * @returns {Promise<boolean>}
 */
export async function renameFile(fileId, filename) {
  const { error } = await supabase
    .from('files')
    .update({ filename })
    .eq('id', fileId);
  if (error) { console.error('renameFile error:', error); return false; }
  return true;
}

/**
 * Delete a file.
 * @param {string} fileId
 * @returns {Promise<boolean>}
 */
export async function deleteFile(fileId) {
  const { error } = await supabase
    .from('files')
    .delete()
    .eq('id', fileId);
  if (error) { console.error('deleteFile error:', error); return false; }
  return true;
}

/**
 * Fetch the N most recently updated files for the dashboard.
 * @param {string} userId
 * @param {number} limit
 * @returns {Promise<Array>}
 */
export async function fetchRecentFiles(userId, limit = 8) {
  const { data, error } = await supabase
    .from('files')
    .select('id, filename, language, updated_at, created_at')
    .eq('user_id', userId)
    .order('updated_at', { ascending: false })
    .limit(limit);
  if (error) { console.error('fetchRecentFiles error:', error); return []; }
  return data || [];
}
