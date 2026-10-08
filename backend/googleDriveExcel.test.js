import assert from 'node:assert/strict';
import test from 'node:test';
import XLSX from 'xlsx';
import { buildExcelBuffer, buildExcelRows, syncDriveExcelFile } from './googleDriveExcel.js';

const ali = {
  _id: 'internal-id-not-exported',
  student_name: 'Ali',
  registration_no: 'BSE234567',
  department: 'Faculty of Computing',
  semester: '6',
  section: '2',
  contact_no: '000000',
  remarks: 'Head',
  game_id: 'internal-game-id-not-exported',
  added_by: 'internal-user-id-not-exported',
  sheet_id: 'internal-sheet-id-not-exported',
  created_at: '2026-10-08 14:20:40'
};

test('buildExcelRows emits only the agreed student columns', () => {
  assert.deepEqual(buildExcelRows([ali], 'Cricket'), [
    ['Student Name', 'Registration No', 'Department', 'Semester', 'Section', 'Contact No', 'Remarks', 'Game', 'Created At'],
    ['Ali', 'BSE234567', 'Faculty of Computing', '6', '2', '000000', 'Head', 'Cricket', '2026-10-08 14:20:40']
  ]);
});

test('Excel file rebuild exports MongoDB rows without duplicates', () => {
  const first = buildExcelBuffer([ali], 'Cricket');
  const retry = buildExcelBuffer([ali], 'Cricket');
  const workbook = XLSX.read(first, { type: 'buffer' });
  const retryWorkbook = XLSX.read(retry, { type: 'buffer' });
  const rows = XLSX.utils.sheet_to_json(workbook.Sheets.Students, { header: 1 });

  assert.deepEqual(rows, buildExcelRows([ali], 'Cricket'));
  assert.deepEqual(
    XLSX.utils.sheet_to_json(retryWorkbook.Sheets.Students, { header: 1 }),
    rows
  );
  assert.equal(rows.length, 2);
});

test('Excel values are stored as text and do not become formulas', () => {
  const workbook = XLSX.read(buildExcelBuffer([{
    ...ali,
    student_name: '=1+1'
  }], 'Cricket'), { type: 'buffer' });

  assert.equal(workbook.Sheets.Students.A2.v, '=1+1');
  assert.equal(workbook.Sheets.Students.A2.f, undefined);
});

test('rebuilding with no MongoDB records leaves only the header row', () => {
  const workbook = XLSX.read(buildExcelBuffer([], 'Cricket'), { type: 'buffer' });
  assert.deepEqual(XLSX.utils.sheet_to_json(workbook.Sheets.Students, { header: 1 }), [
    ['Student Name', 'Registration No', 'Department', 'Semester', 'Section', 'Contact No', 'Remarks', 'Game', 'Created At']
  ]);
});

test('Drive sync creates one workbook per sheet and updates that same file on retry', async () => {
  const previousFolderId = process.env.GOOGLE_DRIVE_FOLDER_ID;
  process.env.GOOGLE_DRIVE_FOLDER_ID = 'configured-folder';
  const created = [];
  const updated = [];
  const listQueries = [];
  let fileExists = false;
  const drive = {
    files: {
      list: async request => {
        listQueries.push(request.q);
        return {
          data: {
            files: fileExists ? [{
              id: 'file-1',
              name: 'criket.xlsx',
              webViewLink: 'https://drive.google.com/file/d/file-1/view'
            }] : []
          }
        };
      },
      get: async ({ fileId }) => ({
        data: { id: fileId, name: 'criket.xlsx', webViewLink: 'https://drive.google.com/file/d/file-1/view' }
      }),
      create: async request => {
        created.push(request);
        fileExists = true;
        return { data: { id: 'file-1', webViewLink: 'https://drive.google.com/file/d/file-1/view' } };
      },
      update: async request => {
        updated.push(request);
        return { data: { id: request.fileId, webViewLink: 'https://drive.google.com/file/d/file-1/view' } };
      }
    },
    permissions: {
      list: async () => ({ data: { permissions: [{ type: 'anyone', role: 'reader' }] } })
    }
  };

  try {
    const first = await syncDriveExcelFile('mongo-sheet-1', 'criket', '', [ali], 'Cricket', drive);
    const retry = await syncDriveExcelFile('mongo-sheet-1', 'criket', '', [ali], 'Cricket', drive);
    const uploaded = Buffer.concat(await (async () => {
      const chunks = [];
      for await (const chunk of updated[0].media.body) chunks.push(chunk);
      return chunks;
    })());
    const uploadedWorkbook = XLSX.read(uploaded, { type: 'buffer' });

    assert.equal(first.fileId, 'file-1');
    assert.equal(retry.fileId, first.fileId);
    assert.equal(created.length, 1);
    assert.equal(updated.length, 1);
    assert.match(listQueries[1], /appProperties has .*mongo_sheet_id.*mongo-sheet-1/);
    assert.equal(created[0].requestBody.name, 'criket.xlsx');
    assert.deepEqual(created[0].requestBody.parents, ['configured-folder']);
    assert.deepEqual(
      XLSX.utils.sheet_to_json(uploadedWorkbook.Sheets.Students, { header: 1 }),
      buildExcelRows([ali], 'Cricket')
    );
  } finally {
    if (previousFolderId === undefined) delete process.env.GOOGLE_DRIVE_FOLDER_ID;
    else process.env.GOOGLE_DRIVE_FOLDER_ID = previousFolderId;
  }
});
