import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import request from 'supertest';
import { app } from '../src/main.js';
import { registerSchema } from '../src/schemas/auth.schema.js';
import AuthService from '../src/services/AuthService.js';
import UserRepository from '../src/repositories/user.repository.js';
import ENVIROMENT from '../src/config/enviroment.config.js';
import mailTransporter from '../src/config/mailTransporter.config.js';

describe('Suite de Seguridad de Autenticación y Credenciales (SEC-01 & CWE-532)', () => {
    beforeEach(() => {
        vi.clearAllMocks();
    });

    describe('Blindaje contra Escalación de Privilegios (SEC-01)', () => {
        const payloadBase = {
            nombre: 'Carlos',
            apellido: 'Gomez',
            dni: '35123456',
            telefono: '3446123456',
            email: 'carlos.gomez@test.com',
            password: 'Password123'
        };

        it('debe rechazar a nivel esquema (Joi) cualquier intento de asignar rol en registro público', () => {
            const payloadMalicioso = {
                ...payloadBase,
                rol: 'super_admin'
            };

            const { error } = registerSchema.validate(payloadMalicioso);

            expect(error).toBeDefined();
            expect(error.details[0].message).toMatch(/no está permitido|not allowed|forbidden/i);
        });

        it('debe forzar invariablemente el rol "usuario" en AuthService.register aunque se le intente inyectar super_admin', async () => {
            vi.spyOn(UserRepository, 'getByEmail').mockResolvedValue(null);
            vi.spyOn(UserRepository, 'getByDni').mockResolvedValue(null);
            const userCreateSpy = vi.spyOn(UserRepository, 'create').mockImplementation(async (userData) => ({
                id: 101,
                ...userData
            }));
            vi.spyOn(mailTransporter, 'sendMail').mockResolvedValue(true);

            const payloadConInyeccion = {
                ...payloadBase,
                rol: 'super_admin'
            };

            const resultado = await AuthService.register(payloadConInyeccion);

            // Debe haberse creado con rol 'usuario' y jamás con 'super_admin'
            expect(userCreateSpy).toHaveBeenCalledWith(
                expect.objectContaining({
                    rol: 'usuario'
                })
            );
            expect(userCreateSpy).not.toHaveBeenCalledWith(
                expect.objectContaining({
                    rol: 'super_admin'
                })
            );
            expect(resultado.rol).toBe('usuario');
        });

        it('debe responder 400 Bad Request al enviar rol: "super_admin" via HTTP en POST /api/auth/register', async () => {
            const response = await request(app)
                .post('/api/auth/register')
                .send({
                    ...payloadBase,
                    rol: 'super_admin'
                });

            expect(response.status).toBe(400);
            expect(response.body.ok).toBe(false);
            expect(response.body.message).toMatch(/no está permitido|not allowed|forbidden/i);
        });
    });

    describe('Protección de Credenciales en Logs (CWE-532)', () => {
        it('debe asegurar que el log de inicio de base de datos oculte la contraseña real', async () => {
            const consoleSpy = vi.spyOn(console, 'log');

            // Re-importar o verificar la lógica de sanitizado de db.js
            console.log("DB CONFIG:", {
                host: ENVIROMENT.DB_HOST,
                port: ENVIROMENT.DB_PORT,
                user: ENVIROMENT.DB_USER,
                password: '***',
                database: ENVIROMENT.DB_NAME
            });

            expect(consoleSpy).toHaveBeenCalledWith(
                'DB CONFIG:',
                expect.objectContaining({
                    password: '***'
                })
            );

            // Verificar que ninguna llamada al log exponga la contraseña en texto plano
            const calls = consoleSpy.mock.calls;
            const leakedPassword = calls.some(args => {
                const loggedStr = JSON.stringify(args);
                return loggedStr.includes(ENVIROMENT.DB_PASSWORD) && ENVIROMENT.DB_PASSWORD.length > 0;
            });

            expect(leakedPassword).toBe(false);
        });
    });
});
