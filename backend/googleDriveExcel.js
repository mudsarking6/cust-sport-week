import { Readable } from 'node:stream';
import { google } from 'googleapis';
import XLSX from 'xlsx';
import { createGoogleOAuthClient, GOOGLE_DRIVE_SCOPE } from './googleDriveOAuth.js';

const columns = [
  'Student Name', 'Registration No', 'Department', 'Semester', 'Section',
  'Contact No', 'Remarks', 'Game', 'Created At'
];
const xlsxMimeType = 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet';
let driveClient;

export function createDriveOAuthClient(env = process.env) {
  const clientId = env.GOOGLE_OAUTH_CLIENT_ID?.trim();
  const clientSecret = env.GOOGLE_OAUTH_CLIENT_SECRET?.trim();
  const redirectUri = env.GOOGLE_OAUTH_REDIRECT_URI?.trim();
  const refreshToken = env.GOOGLE_OAUTH_REFRESH_TOKEN?.trim();
  if (!clientId || !clientSecret || !redirectUri || !refreshToken) {
    throw new Error('Google Drive OAuth is not configured. Set the OAuth client ID, client secret, redirect URI, and refresh token.');
  }

  const auth = createGoogleOAuthClient(clientId, clientSecret, redirectUri);
  auth.setCredentials({ refresh_token: refreshToken, scope: GOOGLE_DRIVE_SCOPE });
  return auth;
}

function getDriveClient() {
  if (driveClient) return driveClient;
  google.options({ timeout: 15000 });
  const auth = createDriveOAuthClient();
  driveClient = google.drive({ version: 'v3', auth });
  return driveClient;
}

export function buildExcelRows(records, gameName) {
  return [
    columns,
    ...records.map(record => [
      record.student_name,
      record.registration_no,
      record.department,
      record.semester,
      record.section,
      record.contact_no,
      record.remarks,
      gameName,
      record.created_at
    ].map(value => String(value ?? '')))
  ];
}

export function buildExcelBuffer(records, gameName) {
  const workbook = XLSX.utils.book_new();
  const worksheet = XLSX.utils.aoa_to_sheet(buildExcelRows(records, gameName));
  XLSX.utils.book_append_sheet(workbook, worksheet, 'Students');
  return XLSX.write(workbook, { type: 'buffer', bookType: 'xlsx', compression: true });
}

function makeDriveQueryString(value) {
  return String(value).replace(/\\/g, '\\\\').replace(/'/g, "\\'");
}

function getFileUrl(fileId, webViewLink) {
  return webViewLink || `https://drive.google.com/file/d/${fileId}/view`;
}

async function findExistingFile(drive, sheetId, fileId, folderId) {
  if (fileId) {
    try {
      const existing = await drive.files.get({
        fileId,
        fields: 'id,name,webViewLink',
        supportsAllDrives: true
      });
      return existing.data;
    } catch (error) {
      if (error.code !== 404) throw error;
    }
  }

  const query = [
    `'${makeDriveQueryString(folderId)}' in parents`,
    `appProperties has { key='mongo_sheet_id' and value='${makeDriveQueryString(sheetId)}' }`,
    'trashed = false'
  ].join(' and ');
  const listed = await drive.files.list({
    q: query,
    pageSize: 100,
    fields: 'files(id,name,webViewLink)',
    supportsAllDrives: true,
    includeItemsFromAllDrives: true
  });
  return listed.data.files?.[0] || null;
}

export async function syncDriveExcelFile(sheetId, title, fileId, records, gameName, drive = getDriveClient()) {
  const folderId = process.env.GOOGLE_DRIVE_FOLDER_ID?.trim();
  if (!folderId) throw new Error('Google Drive folder ID is not configured.');

  const existing = await findExistingFile(drive, String(sheetId), fileId, folderId);
  const name = `${String(title || 'Player sheet').trim() || 'Player sheet'}.xlsx`;
  const buffer = buildExcelBuffer(records, gameName);
  const media = { mimeType: xlsxMimeType, body: Readable.from([buffer]) };
  const response = existing
    ? await drive.files.update({
      fileId: existing.id,
      requestBody: { name },
      media,
      fields: 'id,webViewLink',
      supportsAllDrives: true
    })
    : await drive.files.create({
      requestBody: {
        name,
        mimeType: xlsxMimeType,
        parents: [folderId],
        appProperties: { mongo_sheet_id: String(sheetId) }
      },
      media,
      fields: 'id,webViewLink',
      supportsAllDrives: true
    });
  const savedFileId = response.data.id || existing?.id;
  if (!savedFileId) throw new Error('Google Drive did not return an Excel file ID.');

  await ensureDriveExcelAccess(drive, savedFileId);
  return { fileId: savedFileId, fileUrl: getFileUrl(savedFileId, response.data.webViewLink || existing?.webViewLink) };
}

async function ensureDriveExcelAccess(drive, fileId) {
  const listed = await drive.permissions.list({
    fileId,
    fields: 'permissions(id,type,role)',
    supportsAllDrives: true
  });
  const publicPermission = (listed.data.permissions || []).find(permission => permission.type === 'anyone');
  if (publicPermission?.role === 'reader') return;
  if (publicPermission) {
    await drive.permissions.update({
      fileId,
      permissionId: publicPermission.id,
      requestBody: { role: 'reader' },
      supportsAllDrives: true
    });
    return;
  }
  await drive.permissions.create({
    fileId,
    requestBody: { type: 'anyone', role: 'reader' },
    fields: 'id',
    supportsAllDrives: true
  });
}

export async function deleteDriveExcelFile(fileId) {
  const drive = getDriveClient();
  await drive.files.delete({ fileId, supportsAllDrives: true });
}
