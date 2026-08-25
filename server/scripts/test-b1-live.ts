import { prisma } from '../src/db/prisma';
import { redis } from '../src/lib/redis';
import { env } from '../src/config/env';

const BASE_URL = 'http://localhost:' + env.PORT;

interface ApiResponse<T> {
  success: boolean;
  data?: T;
  error?: { code: string; message: string };
}

async function request<T>(
  endpoint: string,
  method = 'GET',
  body?: unknown,
  token?: string
): Promise<{ status: number; data: ApiResponse<T> }> {
  const headers: Record<string, string> = { 'Content-Type': 'application/json' };
  if (token) headers['Authorization'] = 'Bearer ' + token;

  const response = await fetch(BASE_URL + endpoint, {
    method,
    headers,
    body: body ? JSON.stringify(body) : undefined,
  });

  const text = await response.text();
  let json: ApiResponse<T>;
  try {
    json = JSON.parse(text) as ApiResponse<T>;
  } catch {
    json = { success: false, error: { code: 'HTTP_' + response.status, message: text.slice(0, 200) } };
  }
  return { status: response.status, data: json };
}

async function setupTestData() {
  console.log('[SETUP] Verifying test targets in DB...');

  // 1. Ensure Aarav has ample balance
  const aarav = await prisma.user.findUnique({ where: { phone: '+919876543210' } });
  if (aarav) {
    await prisma.simBankAccount.updateMany({
      where: { userId: aarav.id },
      data: { balancePaisa: 50000000n },
    });
  }

  // 2. Typosquat CHALLENGE Target: challenge.test@oksdi (spoofs @oksbi)
  const challengeVpa = 'challenge.test@oksdi';
  const typoUser = await prisma.user.upsert({
    where: { phone: '+919999999997' },
    update: {},
    create: {
      phone: '+919999999997',
      name: 'Challenge Target User',
      passwordHash: '$2b$12$placeholder',
      riskScore: 0,
    },
  });

  await prisma.simUpiHandle.upsert({
    where: { vpa: challengeVpa },
    update: {},
    create: { userId: typoUser.id, vpa: challengeVpa, isPrimary: true },
  });

  await prisma.simBankAccount.upsert({
    where: { accountNumberMasked: 'XXXXXX9997' },
    update: {},
    create: {
      userId: typoUser.id,
      accountNumberMasked: 'XXXXXX9997',
      balancePaisa: 500000n,
    },
  });

  // Flush Redis reputation cache and prior txns for clean isolation
  await redis.del('reputation:' + challengeVpa);
  await prisma.simTransaction.deleteMany({
    where: {
      OR: [
        { receiverVpa: challengeVpa },
        { receiverId: typoUser.id },
      ],
    },
  });

  // 1 FRAUD (25 pts) + 1 SPAM (5 pts) = 30 pts Layer 2
  // Layer 1 (25 Typo + 10 New Account + 10 Velocity) = 45 pts
  // Total Score = 75 pts -> CHALLENGE verdict (75-89)
  await prisma.complaint.deleteMany({ where: { targetVpa: challengeVpa } });
  await prisma.complaint.create({
    data: {
      complainantId: typoUser.id,
      targetVpa: challengeVpa,
      category: 'FRAUD',
      description: 'Fraud complaint',
      status: 'PENDING',
    },
  });
  await prisma.complaint.create({
    data: {
      complainantId: typoUser.id,
      targetVpa: challengeVpa,
      category: 'SPAM',
      description: 'Spam complaint',
      status: 'PENDING',
    },
  });

  // 3. High-Risk BLOCK Target: mule@oksbii
  const muleVpa = 'mule@oksbii';
  const muleUser = await prisma.user.upsert({
    where: { phone: '+919999999996' },
    update: {},
    create: {
      phone: '+919999999996',
      name: 'Blocked Mule User',
      passwordHash: '$2b$12$placeholder',
      riskScore: 80,
    },
  });

  await prisma.simUpiHandle.upsert({
    where: { vpa: muleVpa },
    update: {},
    create: { userId: muleUser.id, vpa: muleVpa, isPrimary: true },
  });

  await prisma.simBankAccount.upsert({
    where: { accountNumberMasked: 'XXXXXX9996' },
    update: {},
    create: {
      userId: muleUser.id,
      accountNumberMasked: 'XXXXXX9996',
      balancePaisa: 100000n,
    },
  });

  await redis.del('reputation:' + muleVpa);

  // Verified complaints (50 pts) + Direct BLOCKED tx adjacency (15 pts) -> score = 100 (BLOCK)
  await prisma.complaint.deleteMany({ where: { targetVpa: muleVpa } });
  for (let i = 0; i < 4; i++) {
    await prisma.complaint.create({
      data: {
        complainantId: muleUser.id,
        targetVpa: muleVpa,
        category: 'FRAUD',
        description: 'Mule syndicate report #' + i,
        status: 'VERIFIED',
      },
    });
  }

  const existingBlocked = await prisma.simTransaction.count({
    where: { receiverVpa: muleVpa, status: 'BLOCKED' },
  });
  if (existingBlocked === 0) {
    await prisma.simTransaction.create({
      data: {
        senderId: muleUser.id,
        receiverVpa: muleVpa,
        amountPaisa: 5000000n,
        status: 'BLOCKED',
        riskVerdict: 'BLOCK',
        riskScore: 95,
      },
    });
  }

  console.log('[SETUP] Test targets verified.');
}

async function runIntegrationTests() {
  console.log('[INFO] Starting B1 Backend Integration Test Suite...');
  console.log('[INFO] Testing target: ' + BASE_URL);

  await setupTestData();

  let passed = 0;
  let total = 0;

  function assert(condition: boolean, name: string) {
    total++;
    if (condition) {
      console.log('[PASS] ' + name);
      passed++;
    } else {
      console.error('[FAIL] ' + name);
    }
  }

  // --- TEST 1: Health Check ---
  const health = await request<{ status: string }>('/health');
  assert(health.status === 200 && health.data.data?.status === 'HEALTHY',
    'GET /health returns 200 HEALTHY');

  // --- TEST 2: Login with Seeded User (Aarav Sharma) ---
  const loginRes = await request<{ accessToken: string; user: { id: string; name: string } }>(
    '/api/auth/login',
    'POST',
    {
      phone: '9876543210',
      password: 'Password@123',
    }
  );
  assert(loginRes.status === 200 && !!loginRes.data.data?.accessToken,
    'POST /api/auth/login succeeds for Aarav Sharma');

  const authToken = loginRes.data.data?.accessToken || '';

  // --- TEST 3: Profile Lookup ---
  const me = await request<{ name: string; phone: string; bankAccounts: unknown[] }>(
    '/api/auth/me',
    'GET',
    undefined,
    authToken
  );
  assert(me.status === 200 && me.data.data?.name === 'Aarav Sharma',
    'GET /api/auth/me returns profile for Aarav Sharma');

  // --- TEST 4: Safe Circle Add ---
  const addCircle = await request('/api/circle/add', 'POST', {
    contactVpa: 'aditya@okicici',
    contactName: 'Aditya Patel',
  }, authToken);
  assert(addCircle.status === 201 || (addCircle.status === 409 && addCircle.data.error?.code === 'CONFLICT'),
    'POST /api/circle/add adds aditya@okicici to Safe Circle');

  // --- TEST 5: Safe Circle List ---
  const listCircle = await request<{ contacts: unknown[]; total: number }>(
    '/api/circle',
    'GET',
    undefined,
    authToken
  );
  assert(listCircle.status === 200 && (listCircle.data.data?.total ?? 0) >= 1,
    'GET /api/circle returns contacts list with count >= 1');

  // --- TEST 6: VPA Resolve Normal ---
  const resolveNormal = await request<{ name: string; riskVerdict: string }>(
    '/api/vpa/resolve',
    'POST',
    { vpa: 'aditya@okicici' },
    authToken
  );
  assert(resolveNormal.status === 200 && resolveNormal.data.data?.riskVerdict === 'PASS',
    'POST /api/vpa/resolve for aditya@okicici returns PASS');

  // --- TEST 7: VPA Resolve Typosquat ---
  const resolveTypo = await request<{ riskScore: number; riskVerdict: string }>('/api/vpa/resolve', 'POST',
    { vpa: 'challenge.test@oksdi' },
    authToken
  );
  assert(resolveTypo.status === 200 && (resolveTypo.data.data?.riskScore ?? 0) >= 25,
    'POST /api/vpa/resolve for challenge.test@oksdi detects risk (score=' + resolveTypo.data.data?.riskScore + ')');

  // --- TEST 8: Payment Initiate PASS (Safe Circle bypass) ---
  const initPass = await request<{ transactionId: string; verdict: string }>(
    '/api/payment/initiate',
    'POST',
    {
      receiverVpa: 'aditya@okicici',
      amount: 100,
      note: 'Dinner split',
    },
    authToken
  );
  assert(initPass.status === 200 && initPass.data.data?.verdict === 'PASS',
    'POST /api/payment/initiate to Safe Circle returns PASS');

  // --- TEST 9: Payment Confirm (PIN Verification + Ledger Update) ---
  const txnId = initPass.data.data?.transactionId;
  if (txnId) {
    const confirm = await request<{ status: string }>(
      '/api/payment/confirm',
      'POST',
      {
        transactionId: txnId,
        pin: '1234',
      },
      authToken
    );
    assert(confirm.status === 200 && confirm.data.data?.status === 'SUCCESS',
      'POST /api/payment/confirm updates status to SUCCESS');
  } else {
    assert(false, 'POST /api/payment/confirm (skipped, no txnId)');
  }

  // --- TEST 10: Payment CHALLENGE (Typosquat + 30pts Complaints -> Escrow Liveness) ---
  const initChallenge = await request<{ verdict: string; challengeSessionId: string | null; riskScore: number }>(
    '/api/payment/initiate',
    'POST',
    {
      receiverVpa: 'challenge.test@oksdi',
      amount: 500,
      note: 'Transfer test',
    },
    authToken
  );
  assert(
    initChallenge.status === 200 &&
      initChallenge.data.data?.verdict === 'CHALLENGE' &&
      !!initChallenge.data.data?.challengeSessionId,
    'POST /api/payment/initiate to typosquat returns CHALLENGE with escrow challengeSessionId (verdict=' +
      initChallenge.data.data?.verdict + ', score=' + initChallenge.data.data?.riskScore + ')'
  );

  // --- TEST 11: Payment BLOCK (High Risk Mule -> BLOCK) ---
  const initBlock = await request<{ verdict: string; status: string; riskScore: number }>(
    '/api/payment/initiate',
    'POST',
    {
      receiverVpa: 'mule@oksbii',
      amount: 5000,
      note: 'High risk mule transfer',
    },
    authToken
  );
  assert(
    initBlock.status === 200 &&
      initBlock.data.data?.verdict === 'BLOCK' &&
      initBlock.data.data?.status === 'BLOCKED',
    'POST /api/payment/initiate to flagged mule returns BLOCK (score=' + initBlock.data.data?.riskScore + ')'
  );

  // --- TEST 12: Payment History ---
  const history = await request<{ total: number; transactions: unknown[] }>(
    '/api/payment/history',
    'GET',
    undefined,
    authToken
  );
  assert(history.status === 200 && (history.data.data?.total ?? 0) >= 1,
    'GET /api/payment/history returns paginated history');

  console.log('\n[INFO] Test Suite Complete: ' + passed + ' / ' + total + ' passed.');
  if (passed === total) {
    console.log('[SUCCESS] All 12 B1 integration tests PASSED successfully.');
  } else {
    console.error('[ERROR] ' + (total - passed) + ' test(s) failed.');
    process.exit(1);
  }

  await prisma.$disconnect();
}

runIntegrationTests().catch((err) => {
  console.error('[FATAL] ' + (err instanceof Error ? err.message : String(err)));
  process.exit(1);
});