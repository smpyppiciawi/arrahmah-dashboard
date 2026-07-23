import { createClientFromRequest } from 'npm:@base44/sdk@0.8.40';

Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    const user = await base44.auth.me();
    if (!user) return Response.json({ error: 'Unauthorized' }, { status: 401 });

    const { accessToken } = await base44.asServiceRole.connectors.getConnection('googledrive');

    const body = await req.json();
    const { file_url, filename } = body;

    // Download file from app storage
    const fileRes = await fetch(file_url);
    const fileBuffer = await fileRes.arrayBuffer();
    const contentType = fileRes.headers.get('content-type') || 'image/jpeg';

    // Upload to Google Drive using media upload
    const uploadRes = await fetch(
      `https://www.googleapis.com/upload/drive/v3/files?uploadType=media&name=${encodeURIComponent(filename)}`,
      {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${accessToken}`,
          'Content-Type': contentType,
        },
        body: new Uint8Array(fileBuffer),
      }
    );
    const uploaded = await uploadRes.json();

    if (uploaded.error) {
      return Response.json({ error: uploaded.error.message }, { status: 500 });
    }

    // Make file publicly accessible
    await fetch(`https://www.googleapis.com/drive/v3/files/${uploaded.id}/permissions`, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${accessToken}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ role: 'reader', type: 'anyone' }),
    });

    // Get file details with links
    const detailRes = await fetch(
      `https://www.googleapis.com/drive/v3/files/${uploaded.id}?fields=webContentLink,thumbnailLink,webViewLink`,
      { headers: { 'Authorization': `Bearer ${accessToken}` } }
    );
    const detail = await detailRes.json();

    return Response.json({
      file_url: detail.webContentLink || detail.thumbnailLink,
      drive_id: uploaded.id
    });
  } catch (error) {
    return Response.json({ error: error.message }, { status: 500 });
  }
});