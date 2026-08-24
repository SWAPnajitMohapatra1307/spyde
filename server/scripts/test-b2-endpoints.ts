import http from 'http';

function postJson(path: string, body: object, headers: Record<string, string> = {}): Promise<any> {
  return new Promise((resolve, reject) => {
    const data = JSON.stringify(body);
    const req = http.request(
      {
        hostname: 'localhost',
        port: 5000,
        path,
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Content-Length': Buffer.byteLength(data),
          ...headers,
        },
      },
      (res) => {
        let responseData = '';
        res.on('data', (chunk) => (responseData += chunk));
        res.on('end', () => {
          try {
            resolve({ statusCode: res.statusCode, body: JSON.parse(responseData) });
          } catch {
            resolve({ statusCode: res.statusCode, rawBody: responseData });
          }
        });
      }
    );
    req.on('error', reject);
    req.write(data);
    req.end();
  });
}

function getJson(path: string, headers: Record<string, string> = {}): Promise<any> {
  return new Promise((resolve, reject) => {
    const req = http.request(
      {
        hostname: 'localhost',
        port: 5000,
        path,
        method: 'GET',
        headers: {
          ...headers,
        },
      },
      (res) => {
        let responseData = '';
        res.on('data', (chunk) => (responseData += chunk));
        res.on('end', () => {
          try {
            resolve({ statusCode: res.statusCode, body: JSON.parse(responseData) });
          } catch {
            resolve({ statusCode: res.statusCode, rawBody: responseData });
          }
        });
      }
    );
    req.on('error', reject);
    req.end();
  });
}

async function runVerificationSuite() {
  console.log('[INFO] Running live API verification test suite...');

  try {
    const health = await getJson('/health');
    console.log(`[INFO] GET /health -> Status ${health.statusCode}, Success: ${health.body?.success}`);

    const qrResult = await postJson('/api/qr/verify', {
      qrPayload: 'upi://pay?pa=reliance.fresh@okhdfc&pn=Reliance%20Fresh&am=1250.00',
      deviceLat: 19.076,
      deviceLng: 72.877,
    });
    console.log(`[INFO] POST /api/qr/verify -> Status ${qrResult.statusCode}, Verdict: ${qrResult.body?.data?.verdict}`);

    const complaints = await getJson('/api/complaints/against/tanvi@okicici');
    console.log(`[INFO] GET /api/complaints/against/tanvi@okicici -> Status ${complaints.statusCode}, Total Complaints: ${complaints.body?.data?.totalComplaints}`);

    const adminStats = await getJson('/api/admin/stats');
    console.log(`[INFO] GET /api/admin/stats -> Status ${adminStats.statusCode}, Total Users: ${adminStats.body?.data?.totalUsers}`);

    const topFlagged = await getJson('/api/admin/top-flagged');
    console.log(`[INFO] GET /api/admin/top-flagged -> Status ${topFlagged.statusCode}, Top VPA: ${topFlagged.body?.data?.[0]?.vpa}`);

    console.log('[SUCCESS] All endpoint verification tests executed!');
  } catch (error: any) {
    console.error(`[ERROR] Verification suite error: ${error.message}`);
  }
}

runVerificationSuite();