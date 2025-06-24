import { Routes } from '@angular/router';
import { LoginComponent } from './auth/login/login.component';
import { RegisterComponent } from './auth/register/register.component';
import { DashboardComponent } from './dashboard/dashboard.component';
import { JobFormComponent } from './job-form/job-form.component';
import { authGuard } from './guards/auth.guard';
import { alreadyAuthGuard } from './guards/already-auth.guard';
import {AdminDashboardComponent} from './admin/admin-dashboard/admin-dashboard.component';
import {adminGuard} from './guards/admin.guard';

export const routes: Routes = [
  { path: '', redirectTo: '/login', pathMatch: 'full' },
  {
    path: 'login',
    component: LoginComponent,
    canActivate: [alreadyAuthGuard]  // Add this guard
  },
  {
    path: 'register',
    component: RegisterComponent,
    canActivate: [alreadyAuthGuard]  // Add this guard
  },
  {
    path: 'dashboard',
    component: DashboardComponent,
    canActivate: [authGuard]
  },
  {
    path: 'job-form',
    component: JobFormComponent,
    canActivate: [authGuard]
  },
  {
    path: 'admin',
    component: AdminDashboardComponent,
    canActivate: [adminGuard]  // Only admins can access
  },
  // future routes using flexible permission guards
  // Uncomment when you add these features:

  // {
  //   path: 'admin/users',
  //   component: UserManagementComponent,
  //   canActivate: [userManagementGuard] // Checks canManageUsers$ permission
  // },

  // {
  //   path: 'admin/reports',
  //   component: ReportsComponent,
  //   canActivate: [permissionGuard('canExportData$')] // Flexible permission check
  // },

  // {
  //   path: 'admin/settings',
  //   component: AdminSettingsComponent,
  //   canActivate: [permissionGuard('isAdmin$', '/admin')] // Custom redirect path
  // },
  { path: '**', redirectTo: '/login' }
];
