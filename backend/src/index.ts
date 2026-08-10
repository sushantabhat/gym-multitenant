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
      include: {
        subscriptions: {
          include: { plan: true },
          orderBy: { endDate: 'desc' },
          take: 1
        }
      },
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
    const { name, email, phone_number, planId } = req.body;
    
    // Find the plan to calculate endDate
    let plan = null;
    if (planId) {
      plan = await prisma.membershipPlan.findUnique({ where: { id: planId } });
    }

    const newUser = await prisma.user.create({
      data: {
        name,
        email,
        phone_number,
        tenantId: gymId,
        role: 'MEMBER',
        subscriptions: plan ? {
          create: {
            planId: plan.id,
            endDate: new Date(new Date().setMonth(new Date().getMonth() + plan.durationMonths)),
            status: 'ACTIVE'
          }
        } : undefined
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
    const { planId, status } = req.body;
    
    // In a real app we'd update the specific subscription, or create a new one.
    // For this prototype, we'll just update the user's latest subscription.
    const latestSub = await prisma.subscription.findFirst({
      where: { userId },
      orderBy: { createdAt: 'desc' }
    });

    if (latestSub && status) {
      await prisma.subscription.update({
        where: { id: latestSub.id },
        data: { status }
      });
    }

    res.json({ message: 'Updated successfully' });
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
    const user = await prisma.user.findUnique({ 
      where: { id: userId },
      include: {
        subscriptions: {
          where: { status: 'ACTIVE' },
          orderBy: { endDate: 'desc' },
          take: 1
        }
      }
    });
    if (!user || !user.tenantId) return res.status(404).json({ error: 'User not found' });
    if (user.subscriptions.length === 0) return res.status(403).json({ error: 'Subscription is not active' });

    // 10 minute cooldown check
    const tenMinutesAgo = new Date(Date.now() - 10 * 60 * 1000);
    const recentCheckin = await prisma.attendance.findFirst({
      where: { 
        userId: user.id,
        checkInTime: { gte: tenMinutesAgo }
      }
    });

    if (recentCheckin) {
      return res.status(429).json({ error: 'Member already checked in within the last 10 minutes!' });
    }

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
    
    // Since we removed membershipTier/subscriptionStatus fields from User, we'll
    // skip the simple groupings for now and just focus on Subscriptions.
    const tierDistribution: any[] = [];
    const statusDistribution: any[] = [];

    // Get last 30 attendance records
    const recentAttendance = await prisma.attendance.findMany({
      where: { tenantId: gymId },
      orderBy: { checkInTime: 'desc' },
      take: 30,
      include: { user: { select: { name: true } } }
    });

    // Calculate MRR based on active subscriptions
    const activeSubs = await prisma.subscription.findMany({
      where: { 
        status: 'ACTIVE',
        user: { tenantId: gymId }
      },
      include: { plan: true }
    });

    let mrr = 0;
    activeSubs.forEach(sub => {
      // Normalize price to monthly: (Price / DurationMonths)
      const monthlyContribution = sub.plan.price / sub.plan.durationMonths;
      mrr += monthlyContribution;
    });

    res.json({ tierDistribution, statusDistribution, recentAttendance, mrr });
  } catch (error) {
    res.status(500).json({ error: 'Failed to fetch analytics' });
  }
});

// ------------------------------------------------------
// 12. MEMBERSHIP PLANS
// ------------------------------------------------------
app.get('/api/tenant/:gymId/plans', async (req, res) => {
  try {
    const plans = await prisma.membershipPlan.findMany({
      where: { tenantId: req.params.gymId },
      orderBy: { price: 'asc' }
    });
    res.json(plans);
  } catch (error) {
    res.status(500).json({ error: 'Failed to fetch plans' });
  }
});

app.post('/api/tenant/:gymId/plans', async (req, res) => {
  try {
    const { name, durationMonths, price, access, benefits } = req.body;
    const plan = await prisma.membershipPlan.create({
      data: {
        name,
        durationMonths: parseInt(durationMonths),
        price: parseFloat(price),
        access,
        benefits,
        tenantId: req.params.gymId
      }
    });
    res.status(201).json(plan);
  } catch (error) {
    res.status(500).json({ error: 'Failed to create plan' });
  }
});

// ------------------------------------------------------
// 13. GYM ADMIN: CREATE CLASS
// ------------------------------------------------------
app.post('/api/tenant/:gymId/classes', async (req, res) => {
  try {
    const { name, description, instructor, capacity, startTime, duration } = req.body;
    const gymId = req.params.gymId;

    const newClass = await prisma.class.create({
      data: {
        name,
        description,
        instructor,
        capacity: parseInt(capacity),
        startTime: new Date(startTime),
        duration: parseInt(duration),
        tenantId: gymId
      }
    });
    res.status(201).json(newClass);
  } catch (error) {
    res.status(500).json({ error: 'Failed to create class' });
  }
});

// ------------------------------------------------------
// 13. TENANT / MEMBER: GET CLASSES
// ------------------------------------------------------
app.get('/api/tenant/:gymId/classes', async (req, res) => {
  try {
    const gymId = req.params.gymId;
    const classes = await prisma.class.findMany({
      where: { tenantId: gymId },
      orderBy: { startTime: 'asc' },
      include: {
        bookings: { select: { userId: true } }
      }
    });
    // Add computed booking count
    const classesWithCount = classes.map(c => ({
      ...c,
      bookedCount: c.bookings.length
    }));
    res.json(classesWithCount);
  } catch (error) {
    res.status(500).json({ error: 'Failed to fetch classes' });
  }
});

// ------------------------------------------------------
// 14. MEMBER: BOOK CLASS
// ------------------------------------------------------
app.post('/api/member/classes/:classId/book', async (req, res) => {
  try {
    const classId = req.params.classId;
    const { userId } = req.body;
    
    // Check capacity
    const classInfo = await prisma.class.findUnique({
      where: { id: classId },
      include: { _count: { select: { bookings: true } } }
    });
    
    if (!classInfo) return res.status(404).json({ error: 'Class not found' });
    if (classInfo._count.bookings >= classInfo.capacity) {
      return res.status(400).json({ error: 'Class is fully booked!' });
    }

    const booking = await prisma.classBooking.create({
      data: { classId, userId }
    });
    res.json(booking);
  } catch (error: any) {
    if (error.code === 'P2002') return res.status(400).json({ error: 'You are already booked for this class!' });
    res.status(500).json({ error: 'Failed to book class' });
  }
});

// ------------------------------------------------------
// 15. MEMBER PORTAL: LOGIN & FETCH DATA
// ------------------------------------------------------
app.post('/api/member/login', async (req, res) => {
  try {
    const { email } = req.body;
    if (!email) return res.status(400).json({ error: 'Email is required' });

    const user = await prisma.user.findUnique({
      where: { email },
      include: {
        tenant: true, // Get their gym's branding
        subscriptions: {
          include: { plan: true },
          orderBy: { endDate: 'desc' },
          take: 1
        }
      }
    });

    if (!user || user.role !== 'MEMBER') {
      return res.status(404).json({ error: 'Member not found with this email' });
    }

    if (!user.tenant || user.tenant.status !== 'APPROVED') {
      return res.status(403).json({ error: 'Gym is not fully active yet.' });
    }

    // Only return safe data to the client
    const { password, ...safeUser } = user;
    res.json(safeUser);
  } catch (error) {
    res.status(500).json({ error: 'Login failed' });
  }
});

app.get('/api/member/:id/attendance', async (req, res) => {
  try {
    const { id } = req.params;
    const history = await prisma.attendance.findMany({
      where: { userId: id },
      orderBy: { checkInTime: 'desc' },
      take: 50 // Limit to last 50 for performance
    });
    res.json(history);
  } catch (error) {
    res.status(500).json({ error: 'Failed to fetch attendance history' });
  }
});

app.listen(PORT, () => {
  console.log(`🚀 Backend Server is running at http://localhost:${PORT}`);
});
