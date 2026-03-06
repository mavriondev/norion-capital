import fs from "fs";
import path from "path";

let googleAuth: any = null;

async function getGoogleAuth() {
  if (googleAuth) return googleAuth;

  const credentialsPath = process.env.GOOGLE_APPLICATION_CREDENTIALS;
  if (!credentialsPath) {
    console.warn("[Google Drive] GOOGLE_APPLICATION_CREDENTIALS not set — uploads will be saved locally.");
    return null;
  }

  try {
    const { google } = await import("googleapis");
    const credentials = JSON.parse(fs.readFileSync(credentialsPath, "utf-8"));

    if (credentials.type === "service_account") {
      const auth = new google.auth.GoogleAuth({
        keyFile: credentialsPath,
        scopes: ["https://www.googleapis.com/auth/drive.file"],
      });
      googleAuth = google.drive({ version: "v3", auth });
    } else {
      const auth = new google.auth.OAuth2(
        credentials.client_id,
        credentials.client_secret,
        credentials.redirect_uri
      );
      auth.setCredentials({
        refresh_token: credentials.refresh_token || process.env.GOOGLE_REFRESH_TOKEN,
      });
      googleAuth = google.drive({ version: "v3", auth });
    }

    return googleAuth;
  } catch (err) {
    console.warn("[Google Drive] Failed to initialize:", (err as Error).message);
    return null;
  }
}

async function findOrCreateFolder(drive: any, folderName: string, parentId?: string): Promise<string> {
  let q = `name='${folderName}' and mimeType='application/vnd.google-apps.folder' and trashed=false`;
  if (parentId) q += ` and '${parentId}' in parents`;

  const searchRes = await drive.files.list({ q, fields: "files(id,name)" });
  if (searchRes.data.files && searchRes.data.files.length > 0) {
    return searchRes.data.files[0].id;
  }

  const metadata: any = {
    name: folderName,
    mimeType: "application/vnd.google-apps.folder",
  };
  if (parentId) metadata.parents = [parentId];

  const createRes = await drive.files.create({
    requestBody: metadata,
    fields: "id",
  });
  return createRes.data.id;
}

const UPLOAD_DIR = path.resolve(process.cwd(), "uploads");

function ensureUploadDir() {
  if (!fs.existsSync(UPLOAD_DIR)) {
    fs.mkdirSync(UPLOAD_DIR, { recursive: true });
  }
}

export async function uploadToDrive(
  fileBuffer: Buffer,
  fileName: string,
  mimeType: string,
  folderPath: string[]
): Promise<{ fileId: string; fileUrl: string }> {
  const drive = await getGoogleAuth();

  if (!drive) {
    ensureUploadDir();
    const subDir = path.join(UPLOAD_DIR, ...folderPath);
    if (!fs.existsSync(subDir)) {
      fs.mkdirSync(subDir, { recursive: true });
    }
    const filePath = path.join(subDir, fileName);
    fs.writeFileSync(filePath, fileBuffer);
    const relativePath = path.relative(process.cwd(), filePath);
    return {
      fileId: relativePath,
      fileUrl: `/uploads/${folderPath.join("/")}/${fileName}`,
    };
  }

  let parentId: string | undefined;
  for (const folder of folderPath) {
    parentId = await findOrCreateFolder(drive, folder, parentId);
  }

  const { Readable } = await import("stream");
  const uploadRes = await drive.files.create({
    requestBody: {
      name: fileName,
      ...(parentId ? { parents: [parentId] } : {}),
    },
    media: {
      mimeType,
      body: Readable.from(fileBuffer),
    },
    fields: "id,webViewLink",
  });

  return {
    fileId: uploadRes.data.id,
    fileUrl: uploadRes.data.webViewLink || `https://drive.google.com/file/d/${uploadRes.data.id}/view`,
  };
}

export async function testDriveConnection(): Promise<boolean> {
  try {
    const drive = await getGoogleAuth();
    if (!drive) return false;
    const res = await drive.about.get({ fields: "user" });
    return !!res.data.user;
  } catch {
    return false;
  }
}
