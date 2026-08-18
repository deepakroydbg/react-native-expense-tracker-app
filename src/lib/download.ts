import * as FileSystem from 'expo-file-system/legacy';
import * as Sharing from 'expo-sharing';
import { Platform } from 'react-native';

import { brandedBaseName, buildBookExcelBase64, buildBookPDFUri } from '@/lib/export';
import type { Transaction } from '@/lib/transactions';

export type DownloadResult = 'saved' | 'shared' | 'cancelled';

const XLSX_MIME = 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet';

async function saveBase64(
  baseName: string,
  ext: string,
  mimeType: string,
  base64: string,
  uti: string
): Promise<DownloadResult> {
  if (Platform.OS === 'android') {
    const permission = await FileSystem.StorageAccessFramework.requestDirectoryPermissionsAsync();
    if (!permission.granted) return 'cancelled';

    const target = await FileSystem.StorageAccessFramework.createFileAsync(
      permission.directoryUri,
      baseName,
      mimeType
    );
    await FileSystem.writeAsStringAsync(target, base64, {
      encoding: FileSystem.EncodingType.Base64,
    });
    return 'saved';
  }

  const uri = `${FileSystem.documentDirectory}${baseName}.${ext}`;
  await FileSystem.writeAsStringAsync(uri, base64, { encoding: FileSystem.EncodingType.Base64 });
  if (!(await Sharing.isAvailableAsync())) {
    throw new Error('Saving is not available on this device.');
  }
  await Sharing.shareAsync(uri, { mimeType, dialogTitle: 'Save to Files', UTI: uti });
  return 'shared';
}

async function readBase64(fileUri: string): Promise<string> {
  return FileSystem.readAsStringAsync(fileUri, { encoding: FileSystem.EncodingType.Base64 });
}

export async function downloadBookExcel(
  bookName: string,
  txs: Transaction[]
): Promise<DownloadResult> {
  const base64 = buildBookExcelBase64(bookName, txs);
  return saveBase64(
    brandedBaseName(bookName),
    'xlsx',
    XLSX_MIME,
    base64,
    'org.openxmlformats.spreadsheetml.sheet'
  );
}

export async function downloadBookPDF(
  bookName: string,
  txs: Transaction[]
): Promise<DownloadResult> {
  const uri = await buildBookPDFUri(bookName, txs);
  const base64 = await readBase64(uri);
  return saveBase64(brandedBaseName(bookName), 'pdf', 'application/pdf', base64, 'com.adobe.pdf');
}

export async function downloadImage(
  bookName: string,
  fileUri: string
): Promise<DownloadResult> {
  const base64 = await readBase64(fileUri);
  return saveBase64(
    `${brandedBaseName(bookName)}_Summary`,
    'png',
    'image/png',
    base64,
    'public.png'
  );
}
