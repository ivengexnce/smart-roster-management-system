import {
  Pod,
  Brand,
  Process,
  OperatingRule,
  Employee,
  Assignment,
  LeaveRequest,
  PublicHoliday,
  OperatingCalendarType,
  LeaveType,
  LeaveStatus,
  CompOffCredit,
  ShiftSwapRequest,
  SwapStatus,
} from '@/types';
import { getStore, logAudit } from './db';

// Dynamically compute current year and month (e.g. 2026-11 or current real-time month)
export function getCurrentMonthStr(): string {
  const now = new Date();
  const year = now.getFullYear();
  const month = (now.getMonth() + 1).toString().padStart(2, '0');
  return `${year}-${month}`;
}

export function seedBenchmarkData(targetMonth?: string): {
  employeesCount: number;
  brandsCount: number;
  podsCount: number;
  processesCount: number;
  targetMonth: string;
} {
  const currentMonth = targetMonth || getCurrentMonthStr();
  const store = getStore();

  // 1. Pods (3 Operational Teams)
  const pods: Pod[] = [
    {
      id: 'pod-alpha',
      name: 'Pod Alpha',
      code: 'POD-A',
      leadEmployeeId: 'emp-01',
      leadName: 'Rahul Sharma',
      description: 'Customer Experience & Retention Pod 1',
    },
    {
      id: 'pod-beta',
      name: 'Pod Beta',
      code: 'POD-B',
      leadEmployeeId: 'emp-11',
      leadName: 'Priya Patel',
      description: 'E-commerce Operations & Fulfillment Pod',
    },
    {
      id: 'pod-gamma',
      name: 'Pod Gamma',
      code: 'POD-G',
      leadEmployeeId: 'emp-21',
      leadName: 'Amit Verma',
      description: 'Multi-brand Enterprise Support Pod',
    },
  ];

  // 2. Processes (4 Key Core Operational Lines)
  const processes: Process[] = [
    {
      id: 'proc-cs',
      code: 'CS',
      name: 'Customer Support',
      description: 'Tier-1 inbound and real-time live support coverage',
    },
    {
      id: 'proc-acc',
      code: 'ACC',
      name: 'Abandoned Cart Conversions',
      description: 'Outreach and sales recovery workflow',
    },
    {
      id: 'proc-ndr',
      code: 'NDR',
      name: 'Non-Delivery Report Management',
      description: 'Logistics exception handling and re-attempt routing',
    },
    {
      id: 'proc-ret',
      code: 'RETENTION',
      name: 'Customer Retention & Loyalty',
      description: 'VIP escalation and churn prevention',
    },
  ];

  // 3. Employees (Exactly 30 Employees E01 to E30)
  const employees: Employee[] = [];
  const names = [
    'Rahul Sharma', 'Ananya Roy', 'Vikram Malhotra', 'Siddharth Sen', 'Kavita Nair',
    'Rohan Mehta', 'Neha Kapoor', 'Aditya Joshi', 'Pooja Iyer', 'Arjun Das',
    'Priya Patel', 'Ravi Shankar', 'Deepak Verma', 'Sneha Pillai', 'Manoj Kulkarni',
    'Swati Deshmukh', 'Gaurav Bhatia', 'Ritu Saxena', 'Karan Singhal', 'Divya Menon',
    'Amit Verma', 'Tanvi Chawla', 'Sanjay Hegde', 'Meera Nambiar', 'Naveen Reddy',
    'Alok Tripathi', 'Ishita Bannerjee', 'Pranav Rao', 'Shreya Ghosh', 'Varun Kapoor'
  ];

  for (let i = 1; i <= 30; i++) {
    const code = `E${i.toString().padStart(2, '0')}`;
    let podId = 'pod-alpha';
    if (i > 10 && i <= 20) podId = 'pod-beta';
    if (i > 20) podId = 'pod-gamma';

    // Skill distribution
    const qualifiedProcessIds = ['proc-cs'];
    if (i % 2 === 1) qualifiedProcessIds.push('proc-acc');
    if (i % 3 === 0 || i === 1 || i === 9) qualifiedProcessIds.push('proc-ndr');
    if (i % 4 === 0 || i === 2 || i === 8) qualifiedProcessIds.push('proc-ret');

    // Weekly off preferences: spread across Monday (1) to Sunday (0)
    const weeklyOffPreference = (i % 7);

    employees.push({
      id: `emp-${i.toString().padStart(2, '0')}`,
      employeeCode: code,
      fullName: `${names[i - 1]} (${code})`,
      email: `${code.toLowerCase()}@datastraw.io`,
      phone: `+91 98200 ${10000 + i}`,
      podId,
      podName: podId === 'pod-alpha' ? 'Pod Alpha' : podId === 'pod-beta' ? 'Pod Beta' : 'Pod Gamma',
      weeklyOffPreference,
      status: 'ACTIVE',
      qualifiedProcessIds,
      isPodLead: i === 1 || i === 11 || i === 21,
    });
  }

  // 4. Brands (18 Brands: 14 single-resource ~78%, 4 multi-resource)
  const brandNames = [
    { name: 'Brand A', code: 'BR-A', pod: 'pod-alpha', single: true },
    { name: 'Brand B', code: 'BR-B', pod: 'pod-alpha', single: true },
    { name: 'Brand C', code: 'BR-C', pod: 'pod-alpha', single: false }, // Multi: E03, E04
    { name: 'Brand D', code: 'BR-D', pod: 'pod-alpha', single: false }, // Multi: E05, E06, E07
    { name: 'Brand E', code: 'BR-E', pod: 'pod-alpha', single: true },
    { name: 'Brand F', code: 'BR-F', pod: 'pod-beta', single: true },
    { name: 'Brand G', code: 'BR-G', pod: 'pod-beta', single: true },
    { name: 'Brand H', code: 'BR-H', pod: 'pod-beta', single: true },
    { name: 'Brand I', code: 'BR-I', pod: 'pod-beta', single: true },
    { name: 'Brand J', code: 'BR-J', pod: 'pod-beta', single: true },
    { name: 'Brand K', code: 'BR-K', pod: 'pod-beta', single: true },
    { name: 'Brand L', code: 'BR-L', pod: 'pod-beta', single: true },
    { name: 'Brand M', code: 'BR-M', pod: 'pod-gamma', single: true },
    { name: 'Brand N', code: 'BR-N', pod: 'pod-gamma', single: true },
    { name: 'Brand O', code: 'BR-O', pod: 'pod-gamma', single: true },
    { name: 'Brand P', code: 'BR-P', pod: 'pod-gamma', single: true },
    { name: 'Brand Q', code: 'BR-Q', pod: 'pod-gamma', single: false }, // Multi: E22, E23
    { name: 'Brand R', code: 'BR-R', pod: 'pod-gamma', single: false }, // Multi: E24, E25
  ];

  const brands: Brand[] = brandNames.map((b, idx) => ({
    id: `brand-${String.fromCharCode(65 + idx)}`,
    name: b.name,
    code: b.code,
    podId: b.pod,
    isSingleResource: b.single,
    status: 'ACTIVE',
  }));

  // 5. Assignments
  const assignments: Assignment[] = [];

  // Brand A: Dedicated to E01 (CS, ACC, NDR)
  assignments.push(
    { id: 'asgn-a-cs', employeeId: 'emp-01', brandId: 'brand-A', processId: 'proc-cs', isPrimary: true },
    { id: 'asgn-a-acc', employeeId: 'emp-01', brandId: 'brand-A', processId: 'proc-acc', isPrimary: true },
    { id: 'asgn-a-ndr', employeeId: 'emp-01', brandId: 'brand-A', processId: 'proc-ndr', isPrimary: true }
  );

  // Brand B: Dedicated to E02 (CS, Retention)
  assignments.push(
    { id: 'asgn-b-cs', employeeId: 'emp-02', brandId: 'brand-B', processId: 'proc-cs', isPrimary: true },
    { id: 'asgn-b-ret', employeeId: 'emp-02', brandId: 'brand-B', processId: 'proc-ret', isPrimary: true }
  );

  // Brand C: Shared by E03 & E04 (CS, ACC)
  assignments.push(
    { id: 'asgn-c-e3-cs', employeeId: 'emp-03', brandId: 'brand-C', processId: 'proc-cs', isPrimary: true },
    { id: 'asgn-c-e3-acc', employeeId: 'emp-03', brandId: 'brand-C', processId: 'proc-acc', isPrimary: true },
    { id: 'asgn-c-e4-cs', employeeId: 'emp-04', brandId: 'brand-C', processId: 'proc-cs', isPrimary: false },
    { id: 'asgn-c-e4-acc', employeeId: 'emp-04', brandId: 'brand-C', processId: 'proc-acc', isPrimary: false }
  );

  // Brand D: Handled by E05, E06, E07 (CS, ACC, NDR)
  assignments.push(
    { id: 'asgn-d-e5-cs', employeeId: 'emp-05', brandId: 'brand-D', processId: 'proc-cs', isPrimary: true },
    { id: 'asgn-d-e6-acc', employeeId: 'emp-06', brandId: 'brand-D', processId: 'proc-acc', isPrimary: true },
    { id: 'asgn-d-e7-ndr', employeeId: 'emp-07', brandId: 'brand-D', processId: 'proc-ndr', isPrimary: true }
  );

  // Brand E: Dedicated to E08 (CS, Retention)
  assignments.push(
    { id: 'asgn-e-cs', employeeId: 'emp-08', brandId: 'brand-E', processId: 'proc-cs', isPrimary: true },
    { id: 'asgn-e-ret', employeeId: 'emp-08', brandId: 'brand-E', processId: 'proc-ret', isPrimary: true }
  );

  // Single resource brands F to P mapped to E12 to E20
  const singleBrandKeys = ['F', 'G', 'H', 'I', 'J', 'K', 'L', 'M', 'N', 'O', 'P'];
  singleBrandKeys.forEach((char, idx) => {
    const empNum = 12 + idx;
    const empId = `emp-${empNum.toString().padStart(2, '0')}`;
    const brandId = `brand-${char}`;
    assignments.push(
      { id: `asgn-${char.toLowerCase()}-cs`, employeeId: empId, brandId, processId: 'proc-cs', isPrimary: true }
    );
  });

  // Brand Q: E22, E23
  assignments.push(
    { id: 'asgn-q-e22', employeeId: 'emp-22', brandId: 'brand-Q', processId: 'proc-cs', isPrimary: true },
    { id: 'asgn-q-e23', employeeId: 'emp-23', brandId: 'brand-Q', processId: 'proc-ret', isPrimary: true }
  );

  // Brand R: E24, E25
  assignments.push(
    { id: 'asgn-r-e24', employeeId: 'emp-24', brandId: 'brand-R', processId: 'proc-cs', isPrimary: true },
    { id: 'asgn-r-e25', employeeId: 'emp-25', brandId: 'brand-R', processId: 'proc-ndr', isPrimary: true }
  );

  // 6. Operating Rules (Working Calendars & Minimum Staffing)
  const operatingRules: OperatingRule[] = [];

  // Brand A rules
  operatingRules.push(
    { id: 'rule-a-cs', brandId: 'brand-A', processId: 'proc-cs', calendarType: OperatingCalendarType.TYPE_A_365, minStaffingRequired: 1 },
    { id: 'rule-a-acc', brandId: 'brand-A', processId: 'proc-acc', calendarType: OperatingCalendarType.TYPE_C_SUN_HOLIDAYS_OFF, minStaffingRequired: 1 },
    { id: 'rule-a-ndr', brandId: 'brand-A', processId: 'proc-ndr', calendarType: OperatingCalendarType.TYPE_A_365, minStaffingRequired: 1 }
  );

  // Brand B rules
  operatingRules.push(
    { id: 'rule-b-cs', brandId: 'brand-B', processId: 'proc-cs', calendarType: OperatingCalendarType.TYPE_A_365, minStaffingRequired: 1 },
    { id: 'rule-b-ret', brandId: 'brand-B', processId: 'proc-ret', calendarType: OperatingCalendarType.TYPE_B_HOLIDAYS_OFF, minStaffingRequired: 1 }
  );

  // Brand C rules
  operatingRules.push(
    { id: 'rule-c-cs', brandId: 'brand-C', processId: 'proc-cs', calendarType: OperatingCalendarType.TYPE_B_HOLIDAYS_OFF, minStaffingRequired: 1 },
    { id: 'rule-c-acc', brandId: 'brand-C', processId: 'proc-acc', calendarType: OperatingCalendarType.TYPE_C_SUN_HOLIDAYS_OFF, minStaffingRequired: 1 }
  );

  // Brand D rules (Requires 2 CS staff)
  operatingRules.push(
    { id: 'rule-d-cs', brandId: 'brand-D', processId: 'proc-cs', calendarType: OperatingCalendarType.TYPE_A_365, minStaffingRequired: 2 },
    { id: 'rule-d-acc', brandId: 'brand-D', processId: 'proc-acc', calendarType: OperatingCalendarType.TYPE_C_SUN_HOLIDAYS_OFF, minStaffingRequired: 1 },
    { id: 'rule-d-ndr', brandId: 'brand-D', processId: 'proc-ndr', calendarType: OperatingCalendarType.TYPE_A_365, minStaffingRequired: 1 }
  );

  // Rules for Brands E to R (Standard CS 1 staff)
  brands.slice(4).forEach((b) => {
    operatingRules.push({
      id: `rule-${b.id}-cs`,
      brandId: b.id,
      processId: 'proc-cs',
      calendarType: OperatingCalendarType.TYPE_A_365,
      minStaffingRequired: 1,
    });
  });

  // 7. Public Holidays (Current calendar month dates)
  const holidays: PublicHoliday[] = [
    { id: 'hol-1', date: `${currentMonth}-01`, name: 'Monthly Operational Holiday', appliesToAll: true },
    { id: 'hol-2', date: `${currentMonth}-15`, name: 'Mid-Month Festival', appliesToAll: true },
  ];

  // 8. Planned Leaves (Datastraw Benchmark E01 on the 12th of current month)
  const leaves: LeaveRequest[] = [
    {
      id: 'leave-e01-nov12',
      employeeId: 'emp-01',
      employeeName: 'Rahul Sharma (E01)',
      date: `${currentMonth}-12`,
      leaveType: LeaveType.PLANNED_LEAVE,
      status: LeaveStatus.APPROVED,
      reason: 'Personal emergency (Datastraw Benchmark Scenario)',
    },
    {
      id: 'leave-e04-nov18',
      employeeId: 'emp-04',
      employeeName: 'Siddharth Sen (E04)',
      date: `${currentMonth}-18`,
      leaveType: LeaveType.PLANNED_LEAVE,
      status: LeaveStatus.APPROVED,
      reason: 'Planned vacation',
    },
    {
      id: 'leave-e15-nov20',
      employeeId: 'emp-15',
      employeeName: 'Manoj Kulkarni (E15)',
      date: `${currentMonth}-20`,
      leaveType: LeaveType.SICK_LEAVE,
      status: LeaveStatus.APPROVED,
      reason: 'Medical rest',
    },
  ];

  // Comp-off credits earned by employees working on designated weekly offs or holidays
  const compOffs: CompOffCredit[] = [
    {
      id: 'co-e02-01',
      employeeId: 'emp-02',
      employeeName: 'Vikram Joshi (E02)',
      earnedDate: `${currentMonth}-05`,
      earnedReason: 'Worked on designated Sunday weekly-off for Brand B surge support',
      expiryDate: `${currentMonth}-30`,
      status: 'AVAILABLE',
    },
    {
      id: 'co-e08-01',
      employeeId: 'emp-08',
      employeeName: 'Rohan Mehra (E08)',
      earnedDate: `${currentMonth}-08`,
      earnedReason: 'Coverage during national holiday for 365-day operation',
      expiryDate: `${currentMonth}-30`,
      status: 'AVAILABLE',
    },
    {
      id: 'co-e14-01',
      employeeId: 'emp-14',
      employeeName: 'Kavita Rao (E14)',
      earnedDate: `${currentMonth}-02`,
      earnedReason: 'Emergency Sunday backup fulfillment',
      expiryDate: `${currentMonth}-30`,
      status: 'AVAILABLE',
    },
  ];

  // Shift swap requests
  const shiftSwaps: ShiftSwapRequest[] = [
    {
      id: 'swap-01',
      requesterEmpId: 'emp-02',
      requesterEmpName: 'Vikram Joshi (E02)',
      targetEmpId: 'emp-08',
      targetEmpName: 'Rohan Mehra (E08)',
      date: `${currentMonth}-15`,
      brandId: 'brand-B',
      brandName: 'Brand B (Fintech Support)',
      processId: 'proc-cs',
      processName: 'Customer Support',
      reason: 'Personal family engagement in afternoon; requests mutual shift swap',
      status: SwapStatus.PENDING,
      requestedAt: `${currentMonth}-02T09:30:00Z`,
    },
  ];

  // Update store
  store.pods = pods;
  store.processes = processes;
  store.employees = employees;
  store.brands = brands;
  store.assignments = assignments;
  store.operatingRules = operatingRules;
  store.holidays = holidays;
  store.leaves = leaves;
  store.compOffs = compOffs;
  store.shiftSwaps = shiftSwaps;
  store.currentSessionUser = store.users[0];

  logAudit(
    'GENERATE',
    { id: 'u-admin', name: 'Operations Manager', role: store.users[0].role },
    `Seeded benchmark dataset for active current month ${currentMonth}: 30 employees, 18 brands (80% single-resource), 3 pods, 4 processes, and E01 leave on Day 12.`
  );

  return {
    employeesCount: employees.length,
    brandsCount: brands.length,
    podsCount: pods.length,
    processesCount: processes.length,
    targetMonth: currentMonth,
  };
}
