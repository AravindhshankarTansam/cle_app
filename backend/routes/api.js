import express from 'express';
import { authenticate, requireRole } from '../middleware/auth.js';
import * as authController from '../controllers/authController.js';
import * as workerController from '../controllers/workerController.js';
import * as departmentController from '../controllers/departmentController.js';
import * as shiftController from '../controllers/shiftController.js';
import * as skillController from '../controllers/skillController.js';
import * as allocationController from '../controllers/allocationController.js';
import * as hierarchyController from '../controllers/hierarchyController.js';
import * as dashboardController from '../controllers/dashboardController.js';
import * as roleController from '../controllers/roleController.js';
import * as requestController from '../controllers/requestController.js';

const router = express.Router();

// Health check (public)
router.get('/health', (req, res) => {
  res.json({
    status: 'ok',
    uptime: process.uptime(),
    timestamp: new Date().toISOString()
  });
});

// Auth
router.post('/auth/login', authController.login);

// Use authentication middleware for all subsequent API endpoints
router.use(authenticate);

// Authenticated Auth Routes
router.get('/auth/me', requireRole(['Admin', 'HR', 'CEO', 'Manager', 'Supervisor', 'Block Supervisor', 'Floor Supervisor', 'Assembly Line Supervisor', 'Block Manager', 'Floor Manager', 'Line Supervisor', 'IE', 'Employee']), authController.getMe);

// Workers CRUD
router.get('/workers', workerController.getWorkers);
router.post('/workers', requireRole(['Admin', 'HR']), workerController.createWorker);
router.put('/workers/:id', requireRole(['Admin', 'HR']), workerController.updateWorker);
router.delete('/workers/:id', requireRole(['Admin', 'HR']), workerController.deleteWorker);

// Departments CRUD
router.get('/departments', departmentController.getDepartments);
router.post('/departments', requireRole(['Admin']), departmentController.createDepartment);
router.put('/departments/:id', requireRole(['Admin']), departmentController.updateDepartment);
router.delete('/departments/:id', requireRole(['Admin']), departmentController.deleteDepartment);

// Shifts CRUD
router.get('/shifts', shiftController.getShifts);
router.post('/shifts', requireRole(['Admin']), shiftController.createShift);
router.put('/shifts/:id', requireRole(['Admin']), shiftController.updateShift);
router.delete('/shifts/:id', requireRole(['Admin']), shiftController.deleteShift);

// Skills CRUD
router.get('/skills', skillController.getSkills);
router.post('/skills', requireRole(['Admin']), skillController.createSkill);
router.put('/skills/:id', requireRole(['Admin']), skillController.updateSkill);
router.delete('/skills/:id', requireRole(['Admin']), skillController.deleteSkill);

// Roles CRUD
router.get('/roles', roleController.getRoles);
router.post('/roles', requireRole(['Admin']), roleController.createRole);
router.put('/roles/:id', requireRole(['Admin']), roleController.updateRole);
router.delete('/roles/:id', requireRole(['Admin']), roleController.deleteRole);

// Attendance
router.get('/attendance', allocationController.getAttendance);
router.post('/attendance/manual', requireRole(['Admin', 'HR', 'Block Manager', 'Floor Manager', 'Line Supervisor', 'Block Supervisor', 'Floor Supervisor', 'Assembly Line Supervisor']), allocationController.createManualAttendance);

// Allocations
router.get('/allocations', allocationController.getAllocations);
router.post('/allocations', requireRole(['Admin', 'HR', 'Block Manager', 'Floor Manager', 'Line Supervisor', 'Block Supervisor', 'Floor Supervisor', 'Assembly Line Supervisor']), allocationController.createAllocation);
router.post('/allocations/delete', requireRole(['Admin']), allocationController.deleteAllocation);

// Hierarchy Layout & CRUD
router.get('/hierarchy', hierarchyController.getHierarchy);

router.get('/blocks', hierarchyController.getBlocks);
router.post('/blocks', requireRole(['Admin']), hierarchyController.createBlock);
router.put('/blocks/:id', requireRole(['Admin']), hierarchyController.updateBlock);
router.delete('/blocks/:id', requireRole(['Admin']), hierarchyController.deleteBlock);

router.get('/floors', hierarchyController.getFloors);
router.post('/floors', requireRole(['Admin']), hierarchyController.createFloor);
router.put('/floors/:id', requireRole(['Admin']), hierarchyController.updateFloor);
router.delete('/floors/:id', requireRole(['Admin']), hierarchyController.deleteFloor);

router.get('/assembly-lines', hierarchyController.getAssemblyLines);
router.post('/assembly-lines', requireRole(['Admin']), hierarchyController.createAssemblyLine);
router.put('/assembly-lines/:id', requireRole(['Admin']), hierarchyController.updateAssemblyLine);
router.delete('/assembly-lines/:id', requireRole(['Admin']), hierarchyController.deleteAssemblyLine);

// HR Dashboard & Reassignment
router.get('/hr/dashboard', dashboardController.getHRDashboard);
router.post('/hr/reassign', requireRole(['Admin', 'HR', 'Block Manager', 'Floor Manager', 'Line Supervisor', 'Block Supervisor', 'Floor Supervisor', 'Assembly Line Supervisor']), allocationController.reassign);
router.post('/hr/reassign/clear', requireRole(['Admin']), allocationController.clearReassignments);

// Resource Requests
router.get('/requests', requestController.getRequests);
router.post('/requests', requireRole(['Admin', 'HR', 'Block Manager', 'Floor Manager']), requestController.createRequest);
router.put('/requests/:id', requireRole(['Admin', 'HR', 'Block Manager', 'Floor Manager']), requestController.updateRequest);
router.post('/requests/:id/approve', requireRole(['Admin', 'HR', 'Block Manager', 'Floor Manager']), requestController.approveRequest);
router.post('/requests/:id/reject', requireRole(['Admin', 'HR', 'Block Manager', 'Floor Manager']), requestController.rejectRequest);

// Dashboard stats summaries
router.get('/dashboard-summary', dashboardController.getDashboardSummary);

// IE Headcount Plan/Report endpoints
router.get('/ie/headcount', requireRole(['Admin', 'HR', 'CEO', 'IE', 'Block Manager', 'Floor Manager', 'Block Supervisor', 'Floor Supervisor', 'Line Supervisor', 'Assembly Line Supervisor']), dashboardController.getIEHeadcount);
router.post('/ie/headcount', requireRole(['Admin', 'HR', 'IE', 'Block Manager', 'Floor Manager']), dashboardController.updateIEHeadcount);

// Mobile Missed Call logs
router.post('/mobile/call-log', requireRole(['Admin', 'HR', 'Block Manager', 'Floor Manager', 'Line Supervisor', 'Block Supervisor', 'Floor Supervisor', 'Assembly Line Supervisor']), allocationController.createMobileCallLog);
router.get('/mobile/call-log', allocationController.getMobileCallLogs);
router.get('/mobile/shortage-by-number', allocationController.getMobileShortageByNumber);

export default router;
