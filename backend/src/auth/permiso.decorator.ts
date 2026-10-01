import { SetMetadata } from '@nestjs/common';

export const PERMISO_KEY = 'permiso';
export const RequierePermiso = (accion: string) => SetMetadata(PERMISO_KEY, accion);
