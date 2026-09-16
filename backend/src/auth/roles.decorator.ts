import { SetMetadata } from '@nestjs/common';

// Este decorador marca que rutas requieren ciertos roles
// Uso: @Roles('admin') sobre un endpoint
export const ROLES_KEY = 'roles';
export const Roles = (...roles: string[]) => SetMetadata(ROLES_KEY, roles);
