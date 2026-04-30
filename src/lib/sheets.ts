import { google, sheets_v4 } from 'googleapis'

const SHEET_ID = process.env.GOOGLE_SHEETS_ID!

let sheetsClient: sheets_v4.Sheets | null = null

export async function initSheets(): Promise<sheets_v4.Sheets> {
  if (sheetsClient) return sheetsClient
  const auth = new google.auth.GoogleAuth({
    credentials: {
      client_email: process.env.GOOGLE_SERVICE_ACCOUNT_EMAIL,
      private_key: process.env.GOOGLE_PRIVATE_KEY?.replace(/\\n/g, '\n'),
    },
    scopes: ['https://www.googleapis.com/auth/spreadsheets'],
  })
  sheetsClient = google.sheets({ version: 'v4', auth })
  return sheetsClient
}

export async function getSheets(): Promise<sheets_v4.Sheets> {
  return initSheets()
}

export async function readSheet(sheetName: string): Promise<string[][]> {
  const sheets = await initSheets()
  const res = await sheets.spreadsheets.values.get({
    spreadsheetId: SHEET_ID,
    range: `${sheetName}!A2:Z`,
  })
  return res.data.values || []
}

export async function appendRow(sheetName: string, values: string[]): Promise<void> {
  const sheets = await initSheets()
  await sheets.spreadsheets.values.append({
    spreadsheetId: SHEET_ID,
    range: `${sheetName}!A:Z`,
    valueInputOption: 'RAW',
    requestBody: { values: [values] },
  })
}

export async function updateRow(sheetName: string, rowIndex: number, values: string[]): Promise<void> {
  const sheets = await initSheets()
  await sheets.spreadsheets.values.update({
    spreadsheetId: SHEET_ID,
    range: `${sheetName}!A${rowIndex + 2}:Z${rowIndex + 2}`,
    valueInputOption: 'RAW',
    requestBody: { values: [values] },
  })
}

export async function deleteRow(sheetName: string, rowIndex: number): Promise<void> {
  const sheets = await initSheets()
  const meta = await sheets.spreadsheets.get({ spreadsheetId: SHEET_ID })
  const sheet = meta.data.sheets?.find(s => s.properties?.title === sheetName)
  const sheetId = sheet?.properties?.sheetId ?? 0
  await sheets.spreadsheets.batchUpdate({
    spreadsheetId: SHEET_ID,
    requestBody: {
      requests: [{
        deleteDimension: {
          range: {
            sheetId,
            dimension: 'ROWS',
            startIndex: rowIndex + 1,
            endIndex: rowIndex + 2,
          },
        },
      }],
    },
  })
}
