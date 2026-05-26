import { createClient } from '@supabase/supabase-js';
import formidable from 'formidable';
import fs from 'fs';

export const config = {
  api: {
    bodyParser: false,
  },
};

const getSupabase = () => {
  let url = process.env.SUPABASE_URL;
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!url || !key) return null;
  url = url.replace(/\/rest\/v1\/?$/, '').replace(/\/$/, '');
  return createClient(url, key, { auth: { persistSession: false } });
};

export default async function handler(req, res) {
  if (req.method !== 'POST') {
    res.status(405).json({ error: 'Method not allowed' });
    return;
  }

  const supabase = getSupabase();
  if (!supabase) {
    res.status(500).json({ error: 'Database tidak dikonfigurasi.' });
    return;
  }

  const form = formidable({
    maxFiles: 3,
    maxFileSize: 5 * 1024 * 1024, // 5MB
    keepExtensions: true,
  });

  try {
    const [fields, files] = await new Promise((resolve, reject) => {
      form.parse(req, (err, fields, files) => {
        if (err) reject(err);
        resolve([fields, files]);
      });
    });

    const reportId = Array.isArray(fields.reportId) ? fields.reportId[0] : fields.reportId;
    if (!reportId) {
      res.status(400).json({ error: 'reportId wajib disertakan.' });
      return;
    }

    const uploadedFiles = [];
    const fileEntries = Object.values(files).flat();

    for (const file of fileEntries) {
      const fileName = `${reportId}/${Date.now()}-${file.originalFilename}`;
      const fileBuffer = fs.readFileSync(file.filepath);

      // Upload to Supabase Storage Bucket 'evidence'
      const { error: uploadError } = await supabase.storage
        .from('evidence')
        .upload(fileName, fileBuffer, {
          contentType: file.mimetype,
          upsert: true,
        });

      if (uploadError) throw uploadError;

      const {
        data: { publicUrl },
      } = supabase.storage.from('evidence').getPublicUrl(fileName);

      // Save to database
      const { data: dbData, error: dbError } = await supabase
        .from('evidence_files')
        .insert({
          report_id: reportId,
          file_url: publicUrl,
          file_name: file.originalFilename,
          file_size: file.size,
          mime_type: file.mimetype,
        })
        .select()
        .single();

      if (dbError) throw dbError;
      uploadedFiles.push(dbData);
    }

    res.status(200).json({ ok: true, files: uploadedFiles });
  } catch (error) {
    console.error('File upload error:', error);
    res.status(500).json({ error: 'Gagal mengunggah file bukti.' });
  }
}
