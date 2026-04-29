import { google } from 'googleapis'

const SHEETS_ID = process.env.GOOGLE_SHEETS_ID!

function getAuth() {
  const privateKey = process.env.GOOGLE_PRIVATE_KEY?.replace(/\\n/g, '\n')
  return new google.auth.GoogleAuth({
    credentials: {
      client_email: process.env.GOOGLE_SERVICE_ACCOUNT_EMAIL,
      private_key: privateKey,
    },
    scopes: ['https://www.googleapis.com/auth/spreadsheets'],
  })
}

export async function getSheets() {
  const auth = getAuth()
  return google.sheets({ version: 'v4', auth })
}

export async function readSheet(range: string) {
  const sheets = await getSheets()
  const res = await sheets.spreadsheets.values.get({
    spreadsheetId: SHEETS_ID,
    range,
  })
  return res.data.values || []
}

export async function appendRow(range: string, values: string[]) {
  const sheets = await getSheets()
  await sheets.spreadsheets.values.append({
    spreadsheetId: SHEETS_ID,
    range,
    valueInputOption: 'RAW',
    requestBody: { values: [values] },
  })
}

export async function updateRow(range: string, values: string[]) {
  const sheets = await getSheets()
  await sheets.spreadsheets.values.update({
    spreadsheetId: SHEETS_ID,
    range,
    valueInputOption: 'RAW',
    requestBody: { values: [values] },
  })
}

export async function deleteRow(sheetName: string, rowIndex: number) {
  const sheets = await getSheets()
  const spreadsheet = await sheets.spreadsheets.get({ spreadsheetId: SHEETS_ID })
  const sheet = spreadsheet.data.sheets?.find(s => s.properties?.title === sheetName)
  if (!sheet?.properties?.sheetId) return
  await sheets.spreadsheets.batchUpdate({
    spreadsheetId: SHEETS_ID,
    requestBody: {
      requests: [{
        deleteDimension: {
          range: {
            sheetId: sheet.properties.sheetId,
            dimension: 'ROWS',
            startIndex: rowIndex,
            endIndex: rowIndex + 1,
          },
        },
      }],
    },
  })
}

// Initialize sheets with headers if empty
export async function initSheets() {
  const sheets = await getSheets()
  const spreadsheet = await sheets.spreadsheets.get({ spreadsheetId: SHEETS_ID })
  const existingSheets = spreadsheet.data.sheets?.map(s => s.properties?.title) || []

  const required = [
    { name: 'users', headers: ['uid', 'email', 'name', 'photo', 'created_at'] },
    { name: 'trips', headers: ['trip_id', 'uid', 'title', 'country', 'city', 'start_date', 'end_date', 'created_at'] },
    { name: 'schedules', headers: ['schedule_id', 'trip_id', 'uid', 'day', 'time', 'place', 'memo', 'created_at'] },
  ]

  for (const sheet of required) {
    if (!existingSheets.includes(sheet.name)) {
      await sheets.spreadsheets.batchUpdate({
        spreadsheetId: SHEETS_ID,
        requestBody: {
          requests: [{ addSheet: { properties: { title: sheet.name } } }],
        },
      })
      await sheets.spreadsheets.values.update({
        spreadsheetId: SHEETS_ID,
        range: `${sheet.name}!A1`,
        valueInputOption: 'RAW',
        requestBody: { values: [sheet.headers] },
      })
    } else {
      // Check if headers exist
      const res = await sheets.spreadsheets.values.get({
        spreadsheetId: SHEETS_ID,
        range: `${sheet.name}!A1:Z1`,
      })
      if (!res.data.values || res.data.values.length === 0) {
        await sheets.spreadsheets.values.update({
          spreadsheetId: SHEETS_ID,
          range: `${sheet.name}!A1`,
          valueInputOption: 'RAW',
          requestBody: { values: [sheet.headers] },
        })
      }
    }
  }
}
