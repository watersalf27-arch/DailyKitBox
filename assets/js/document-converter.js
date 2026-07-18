/**
 * DailyKitBox â€” Document Converter Pro proxy
 * Deploys as a Cloudflare Worker. Keeps the CloudConvert API key server-side.
 *
 * Routes:
 *   POST /convert        multipart/form-data { file, targetFormat } -> { jobId }
 *   GET  /status/:jobId   -> { status: "waiting"|"processing"|"finished"|"error", downloadUrl?, message? }
 *   GET  /download/:jobId -> streams the converted file (passthrough, avoids CORS issues
 *                            with CloudConvert's own export host)
 *
 * Required secret (set with `wrangler secret put CLOUDCONVERT_API_KEY`):
 *   CLOUDCONVERT_API_KEY   â€” your CloudConvert API key (https://cloudconvert.com/dashboard/api/v2/keys)
 *
 * Required var (in wrangler.toml [vars] or dashboard):
 *   ALLOWED_ORIGIN          â€” e.g. "https://dailykitbox.com"
 *
 * NOTE: verify current field/endpoint names against CloudConvert's live docs
 * (https://cloudconvert.com/api/v2) before going to production â€” API details
 * can change and this was written from documentation available at build time.
 */

const CC_BASE = 'https://api.cloudconvert.com/v2';

function corsHeaders(env) {
  return {
    'Access-Control-Allow-Origin': env.ALLOWED_ORIGIN || '*',
    'Access-Control-Allow-Methods': 'GET,POST,OPTIONS',
    'Access-Control-Allow-Headers': 'Content-Type'
  };
}

function json(data, status, env) {
  return new Response(JSON.stringify(data), {
    status: status || 200,
    headers: Object.assign({ 'Content-Type': 'application/json' }, corsHeaders(env))
  });
}

export default {
  async fetch(request, env) {
    const url = new URL(request.url);

    if (request.method === 'OPTIONS') {
      return new Response(null, { headers: corsHeaders(env) });
    }

    try {
      if (request.method === 'POST' && url.pathname === '/convert') {
        return await handleConvert(request, env);
      }
      if (request.method === 'GET' && url.pathname.startsWith('/status/')) {
        const jobId = url.pathname.split('/status/')[1];
        return await handleStatus(jobId, url.origin, env);
      }
      if (request.method === 'GET' && url.pathname.startsWith('/download/')) {
        const jobId = url.pathname.split('/download/')[1];
        return await handleDownload(jobId, env);
      }
      return json({ error: 'Not found' }, 404, env);
    } catch (err) {
      return json({ error: err.message || 'Unexpected error' }, 500, env);
    }
  }
};

async function handleConvert(request, env) {
  const form = await request.formData();
  const file = form.get('file');
  const targetFormat = form.get('targetFormat');
  if (!file || !targetFormat) {
    return json({ error: 'file and targetFormat are required' }, 400, env);
  }

  // 1) Create a job: upload -> convert -> export/url
  const jobRes = await fetch(`${CC_BASE}/jobs`, {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${env.CLOUDCONVERT_API_KEY}`,
      'Content-Type': 'application/json'
    },
    body: JSON.stringify({
      tasks: {
        'upload-file': { operation: 'import/upload' },
        'convert-file': {
          operation: 'convert',
          input: 'upload-file',
          output_format: targetFormat
        },
        'export-file': { operation: 'export/url', input: 'convert-file' }
      }
    })
  });
  const jobData = await jobRes.json();
  if (!jobRes.ok) {
    return json({ error: (jobData.message || 'Failed to create job') }, 502, env);
  }

  const uploadTask = jobData.data.tasks.find((t) => t.name === 'upload-file');
  const uploadForm = uploadTask.result.form;

  // 2) Upload the actual file bytes to the pre-signed upload form
  const relay = new FormData();
  Object.entries(uploadForm.parameters).forEach(([k, v]) => relay.append(k, v));
  relay.append('file', file, file.name);

  const uploadRes = await fetch(uploadForm.url, { method: 'POST', body: relay });
  if (!uploadRes.ok) {
    return json({ error: 'File upload to CloudConvert failed' }, 502, env);
  }

  return json({ jobId: jobData.data.id }, 200, env);
}

async function handleStatus(jobId, origin, env) {
  const res = await fetch(`${CC_BASE}/jobs/${jobId}`, {
    headers: { Authorization: `Bearer ${env.CLOUDCONVERT_API_KEY}` }
  });
  const data = await res.json();
  if (!res.ok) return json({ status: 'error', message: data.message || 'Lookup failed' }, 200, env);

  const status = data.data.status; // waiting | processing | finished | error
  if (status === 'error') {
    const failedTask = data.data.tasks.find((t) => t.status === 'error');
    return json({ status: 'error', message: (failedTask && failedTask.message) || 'Conversion failed' }, 200, env);
  }
  if (status === 'finished') {
    // Route the download back through this Worker (keeps the API key server-side
    // and avoids relying on CloudConvert's export host allowing cross-origin reads).
    return json({ status: 'finished', downloadUrl: `${origin}/download/${jobId}` }, 200, env);
  }
  return json({ status: status }, 200, env);
}

async function handleDownload(jobId, env) {
  const res = await fetch(`${CC_BASE}/jobs/${jobId}`, {
    headers: { Authorization: `Bearer ${env.CLOUDCONVERT_API_KEY}` }
  });
  const data = await res.json();
  if (!res.ok) return json({ error: 'Job lookup failed' }, 502, env);

  const exportTask = data.data.tasks.find((t) => t.operation === 'export/url' && t.status === 'finished');
  if (!exportTask || !exportTask.result || !exportTask.result.files || !exportTask.result.files[0]) {
    return json({ error: 'File not ready' }, 409, env);
  }
  const fileMeta = exportTask.result.files[0];
  const fileRes = await fetch(fileMeta.url);
  return new Response(fileRes.body, {
    headers: Object.assign(
      {
        'Content-Type': fileRes.headers.get('Content-Type') || 'application/octet-stream',
        'Content-Disposition': `attachment; filename="${fileMeta.filename}"`
      },
      corsHeaders(env)
    )
  });
}