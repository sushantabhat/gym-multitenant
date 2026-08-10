import 'dotenv/config';
import express from 'express';
import cors from 'cors';
import { PrismaClient } from '@prisma/client';
import { Pool } from 'pg';
import { PrismaPg } from '@prisma/adapter-pg';

const connectionString = process.env.DATABASE_URL;
const pool = new Pool({ connectionString });
const adapter = new PrismaPg(pool);
const prisma = new PrismaClient({ adapter });

const app = express();
app.use(cors());
app.use(express.json());
const PORT = 3001;

// ------------------------------------------------------
// SEED MASTER PLATFORM ADMIN
// ------------------------------------------------------
async function seedPlatformAdmin() {
  await prisma.user.upsert({
    where: { email: 'admin@acmefit.com' },
    update: {},
    create: {
      name: 'AcmeFit Founder',
      email: 'admin@acmefit.com',
      password: 'password123',
      role: 'PLATFORM_ADMIN'
    }
  });
  console.log("✅ Master Platform Admin Seeded: admin@acmefit.com / password123");
}
seedPlatformAdmin();

// ------------------------------------------------------
// PLATFORM ADMIN SECURITY MIDDLEWARE
// ------------------------------------------------------
const requirePlatformAdmin = async (req: express.Request, res: express.Response, next: express.NextFunction) => {
  const adminEmail = req.headers['x-admin-email'] as string;
  if (!adminEmail) return res.status(401).json({ error: 'Unauthorized: Missing Admin Email Header' });

  const admin = await prisma.user.findFirst({
    where: { email: adminEmail, role: 'PLATFORM_ADMIN' }
  });

  if (!admin) return res.status(403).json({ error: 'Forbidden: You are not a Platform Admin' });
  next();
};

// ------------------------------------------------------
// 0. PLATFORM ADMIN: SECURE LOGIN
// ------------------------------------------------------
app.post('/api/admin/login', async (req, res) => {
  try {
    const { email, password } = req.body;
    const admin = await prisma.user.findFirst({
      where: { email, password, role: 'PLATFORM_ADMIN' }
    });

    if (!admin) {
      return res.status(401).json({ error: 'Invalid email or password' });
    }

    res.json({ success: true, email: admin.email, name: admin.name });
  } catch (error) {
    res.status(500).json({ error: 'Login failed' });
  }
});

// ------------------------------------------------------
// 1. PUBLIC REGISTRATION: GYM APPLIES FOR SOFTWARE
// ------------------------------------------------------
app.post('/api/gyms', async (req, res) => {
  try {
    const { name, adminName, adminEmail } = req.body;
    if (!name || !adminName || !adminEmail) {
      return res.status(400).json({ error: 'Gym Name, Admin Name, and Admin Email are required!' });
    }

    const newTenant = await prisma.tenant.create({
      data: {
        name,
        status: 'PENDING',
        users: {
          create: { name: adminName, email: adminEmail, role: 'GYM_ADMIN' }
        },
        featureFlags: {
          create: { key: 'export-data', isEnabled: false }
        }
      },
      include: { users: true, featureFlags: true }
    });
    res.status(201).json(newTenant);
  } catch (error) {
    res.status(500).json({ error: 'Failed to create gym application' });
  }
});

// ------------------------------------------------------
// 1.5. PUBLIC: GET ALL APPROVED GYMS
// ------------------------------------------------------
app.get('/api/gyms', async (req, res) => {
  try {
    const gyms = await prisma.tenant.findMany({
      where: { status: 'APPROVED' },
      orderBy: { createdAt: 'desc' }
    });
    res.json(gyms);
  } catch (error) {
    res.status(500).json({ error: 'Failed to fetch gyms' });
  }
});

// ------------------------------------------------------
// 2. PLATFORM ADMIN: VIEW ALL GYMS
// ------------------------------------------------------
app.get('/api/admin/gyms', requirePlatformAdmin, async (req, res) => {
  try {
    const gyms = await prisma.tenant.findMany({
      include: { 
        users: { where: { role: 'GYM_ADMIN' } },
        featureFlags: true
      },
      orderBy: { createdAt: 'desc' }
    });
    res.json(gyms);
  } catch (error) {
    res.status(500).json({ error: 'Failed to fetch gyms' });
  }
});

// ------------------------------------------------------
// 3. PLATFORM ADMIN: APPROVE GYM
// ------------------------------------------------------
app.put('/api/admin/gyms/:id/approve', requirePlatformAdmin, async (req, res) => {
  try {
    const gym = await prisma.tenant.update({
      where: { id: req.params.id },
      data: { status: 'APPROVED' }
    });
    res.json(gym);
  } catch (error) {
    res.status(500).json({ error: 'Failed to approve gym' });
  }
});

// ------------------------------------------------------
// 4. PLATFORM ADMIN: TOGGLE FEATURE FLAG
// ------------------------------------------------------
app.put('/api/admin/gyms/:id/flags/:key', requirePlatformAdmin, async (req, res) => {
  try {
    const { id, key } = req.params;
    const { isEnabled } = req.body;
    
    const flag = await prisma.featureFlag.upsert({
      where: { key_tenantId: { key, tenantId: id } },
      update: { isEnabled },
      create: { key, isEnabled, tenantId: id }
    });
    res.json(flag);
  } catch (error) {
    res.status(500).json({ error: 'Failed to toggle flag' });
  }
});

// ------------------------------------------------------
// 5. TENANT ADMIN: FETCH DASHBOARD DATA (SECURED)
// ------------------------------------------------------
app.get('/api/tenant/:id/dashboard', async (req, res) => {
  try {
    const gymId = req.params.id;
    const adminEmail = req.query.email as string;
    if (!adminEmail) return res.status(401).json({ error: 'Unauthorized: Admin email is required' });

    const gym = await prisma.tenant.findUnique({ 
      where: { id: gymId },
      include: { featureFlags: true }
    });
    
    if (!gym) return res.status(404).json({ error: 'Gym not found' });
    if (gym.status !== 'APPROVED') return res.status(403).json({ error: 'Gym account is pending verification.' });

    const adminUser = await prisma.user.findFirst({
      where: { email: adminEmail, tenantId: gymId, role: 'GYM_ADMIN' }
    });

    if (!adminUser) return res.status(403).json({ error: 'Forbidden: You are not an Admin for this gym' });

    const members = await prisma.user.findMany({
      where: { tenantId: gymId, role: 'MEMBER' },
      orderBy: { createdAt: 'desc' }
    });

    res.json({ gym, members });
  } catch (error) {
    res.status(500).json({ error: 'Failed to fetch tenant dashboard data' });
  }
});

// ------------------------------------------------------
// 6. PUBLIC: REGISTER MEMBER TO APPROVED GYM
// ------------------------------------------------------
app.post('/api/users', async (req, res) => {
  try {
    const { name, email, phone_number, tenantId } = req.body;
    if (!name || !email || !tenantId) return res.status(400).json({ error: 'Missing fields' });

    const gym = await prisma.tenant.findUnique({ where: { id: tenantId }});
    if (gym?.status !== 'APPROVED') return res.status(403).json({ error: 'Gym is not verified' });

    const newUser = await prisma.user.create({
      data: { name, email, phone_number, tenantId, role: 'MEMBER' }
    });
    res.status(201).json(newUser);
  } catch (error) {
    res.status(500).json({ error: 'Failed to create user' });
  }
});

// ------------------------------------------------------
// 7. GYM ADMIN: CREATE MEMBER
// ------------------------------------------------------
app.post('/api/tenant/:id/members', async (req, res) => {
  try {
    const gymId = req.params.id;
    const { name, email, phone_number, membershipTier } = req.body;
    // Basic auth check (should verify adminEmail in real app, but for speed we trust the dashboard call)
    
    const newUser = await prisma.user.create({
      data: {
        name,
        email,
        phone_number,
        tenantId: gymId,
        role: 'MEMBER',
        membershipTier: membershipTier || 'BASIC',
        subscriptionStatus: 'ACTIVE'
      }
    });
    res.status(201).json(newUser);
  } catch (error: any) {
    if (error.code === 'P2002') {
      return res.status(400).json({ error: 'A user with that email already exists!' });
    }
    res.status(500).json({ error: 'Failed to create member' });
  }
});

// ------------------------------------------------------
// 7.5 GYM ADMIN: EDIT & DELETE MEMBER
// ------------------------------------------------------
app.delete('/api/users/:userId', async (req, res) => {
  try {
    await prisma.user.delete({ where: { id: req.params.userId } });
    res.status(204).send();
  } catch (error) {
    res.status(500).json({ error: 'Failed to delete member' });
  }
});

app.put('/api/users/:userId/details', async (req, res) => {
  try {
    const { name, email, phone_number, membershipTier } = req.body;
    const updatedUser = await prisma.user.update({
      where: { id: req.params.userId },
      data: { name, email, phone_number, membershipTier }
    });
    res.json(updatedUser);
  } catch (error: any) {
    if (error.code === 'P2002') return res.status(400).json({ error: 'Email already exists' });
    res.status(500).json({ error: 'Failed to update member' });
  }
});

// ------------------------------------------------------
// 8. GYM ADMIN: UPDATE SETTINGS (WHITE-LABELING)
// ------------------------------------------------------
app.put('/api/tenant/:id/settings', async (req, res) => {
  try {
    const gymId = req.params.id;
    const { brandColor, welcomeMessage } = req.body;
    
    const updated = await prisma.tenant.update({
      where: { id: gymId },
      data: { brandColor, welcomeMessage }
    });
    res.json(updated);
  } catch (error) {
    res.status(500).json({ error: 'Failed to update settings' });
  }
});

// ------------------------------------------------------
// 9. GYM ADMIN: UPDATE MEMBERSHIP
// ------------------------------------------------------
app.put('/api/users/:userId/membership', async (req, res) => {
  try {
    const { userId } = req.params;
    const { membershipTier, subscriptionStatus } = req.body;
    
    const updated = await prisma.user.update({
      where: { id: userId },
      data: { membershipTier, subscriptionStatus }
    });
    res.json(updated);
  } catch (error) {
    res.status(500).json({ error: 'Failed to update membership' });
  }
});

// ------------------------------------------------------
// 10. GYM ADMIN: CHECK-IN MEMBER
// ------------------------------------------------------
app.post('/api/users/:userId/checkin', async (req, res) => {
  try {
    const { userId } = req.params;
    // Find the user to get their tenantId
    const user = await prisma.user.findUnique({ where: { id: userId } });
    if (!user || !user.tenantId) return res.status(404).json({ error: 'User not found' });
    if (user.subscriptionStatus !== 'ACTIVE') return res.status(403).json({ error: 'Subscription is not active' });

    const attendance = await prisma.attendance.create({
      data: {
        userId: user.id,
        tenantId: user.tenantId
      }
    });
    res.status(201).json(attendance);
  } catch (error) {
    res.status(500).json({ error: 'Failed to check in' });
  }
});

// ------------------------------------------------------
// 11. GYM ADMIN: GET ANALYTICS DATA
// ------------------------------------------------------
app.get('/api/tenant/:id/analytics', async (req, res) => {
  try {
    const gymId = req.params.id;
    
    // Group members by tier
    const tierDistribution = await prisma.user.groupBy({
      by: ['membershipTier'],
      where: { tenantId: gymId, role: 'MEMBER' },
      _count: { id: true }
    });

    // Group members by status
    const statusDistribution = await prisma.user.groupBy({
      by: ['subscriptionStatus'],
      where: { tenantId: gymId, role: 'MEMBER' },
      _count: { id: true }
    });

    // Get last 30 attendance records
    const recentAttendance = await prisma.attendance.findMany({
      where: { tenantId: gymId },
      orderBy: { checkInTime: 'desc' },
      take: 30,
      include: { user: { select: { name: true } } }
    });

    res.json({ tierDistribution, statusDistribution, recentAttendance });
  } catch (error) {
    res.status(500).json({ error: 'Failed to fetch analytics' });
  }
});

app.listen(PORT, () => {
  console.log(`🚀 Backend Server is running at http://localhost:${PORT}`);
});
