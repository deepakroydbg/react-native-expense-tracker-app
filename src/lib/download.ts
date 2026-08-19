import AsyncStorage from '@react-native-async-storage/async-storage';
import * as FileSystem from 'expo-file-system/legacy';
import * as MediaLibrary from 'expo-media-library';
import * as Sharing from 'expo-sharing';
import { Platform } from 'react-native';

import { brandedBaseName, buildBookExcelBase64, buildBookPDFUri } from '@/lib/export';
import type { Transaction } from '@/lib/transactions';

export type DownloadResult = 'saved' | 'shared' | 'cancelled' | 'denied';

const DIR_KEY = 'mykhata.download-dir';
const XLSX_MIME = 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet';

const SAF = FileSystem.StorageAccessFramework;

async function readSavedDir(): Promise<string | null> {
  try {
    return await AsyncStorage.getItem(DIR_KEY);
  } catch {
    return null;
  }
}

async function askForDir(): Promise<string | null> {
  const permission = await SAF.requestDirectoryPermissionsAsync();
  if (!permission.granted) return null;
  try {
    await AsyncStorage.setItem(DIR_KEY, permission.directoryUri);
  } catch {
    // ignore
  }
  return permission.directoryUri;
}

async function forgetDir(): Promise<void> {
  try {
    await AsyncStorage.removeItem(DIR_KEY);
  } catch {
    // ignore
  }
}

async function writeInto(
  dirUri: string,
  baseName: string,
  mimeType: string,
  base64: string
): Promise<void> {
  const target = await SAF.createFileAsync(dirUri, baseName, mimeType);
  await FileSystem.writeAsStringAsync(target, base64, {
    encoding: FileSystem.EncodingType.Base64,
  });
}

async function saveBase64(
  baseName: string,
  ext: string,
  mimeType: string,
  base64: string,
  uti: string
): Promise<DownloadResult> {
  if (Platform.OS !== 'android') {
    const uri = `${FileSystem.documentDirectory}${baseName}.${ext}`;
    await FileSystem.writeAsStringAsync(uri, base64, { encoding: FileSystem.EncodingType.Base64 });
    if (!(await Sharing.isAvailableAsync())) {
      throw new Error('Saving is not available on this device.');
    }
    await Sharing.shareAsync(uri, { mimeType, dialogTitle: 'Save to Files', UTI: uti });
    return 'shared';
  }

  const saved = await readSavedDir();
  if (saved) {
    try {
      await writeInto(saved, baseName, mimeType, base64);
      return 'saved';
    } catch {
      await forgetDir();
    }
  }

  const dirUri = await askForDir();
  if (!dirUri) return 'cancelled';
  await writeInto(dirUri, baseName, mimeType, base64);
  return 'saved';
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

export async function downloadImage(bookName: string, fileUri: string): Promise<DownloadResult> {
  let source = fileUri;
  const named = `${FileSystem.cacheDirectory}${brandedBaseName(bookName)}_Summary.png`;
  try {
    await FileSystem.deleteAsync(named, { idempotent: true });
    await FileSystem.copyAsync({ from: fileUri, to: named });
    source = named;
  } catch {
    // ignore
  }

  const permission = await MediaLibrary.requestPermissionsAsync(true);
  try {
    await MediaLibrary.saveToLibraryAsync(source);
    return 'saved';
  } catch (e) {
    if (!permission.granted) return 'denied';
    throw e;
  }
}
