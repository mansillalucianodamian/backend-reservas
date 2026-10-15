import { describe, it, expect, vi, beforeEach } from 'vitest';
import request from 'supertest';
import jwt from 'jsonwebtoken';
import { app } from '../src/main.js';
import ENVIROMENT from '../src/config/enviroment.config.js';
import DefaultReservaRepository from '../src/repositories/reserva.repository.js';
import UserRepository from '../src/repositories/user.repository.js';
import ConfigController from '../src/controllers/config.controller.js';
import * as ShellyService from '../src/services/ShellyService.js';

describe('Suite de Pruebas de Blindaje de Seguridad y OWASP Hardening', () => {
    // Helper para generar tokens JWT de prueba con diferentes roles y usuarios
    const generateToken = (payload) => {
        return jwt.sign(
            {
                user_id: payload.id,
                nombre: payload.nombre || 'Test',
                apellido: payload.apellido || 'User',
                email: payload.email || 'test@example.com',
                rol: payload.rol || 'usuario'
            },
            ENVIROMENT.JWT_SECRET,
            { expiresIn: '1h' }
        );
    };

    const tokenUsuarioA = generateToken({ id: 10, nombre: 'Vecino A', rol: 'usuario' });
    const tokenUsuarioB = generateToken({ id: 20, nombre: 'Vecino B', rol: 'usuario' });
    const tokenRecepcionista = generateToken({ id: 5, nombre: 'Recepcionista', rol: 'recepcionista' });
    const tokenSuperAdmin = generateToken({ id: 1, nombre: 'Admin', rol: 'super_admin' });

    beforeEach(() => {
        vi.clearAllMocks();
        // Silenciar llamadas de hardware en tests de integración
        vi.spyOn(ShellyService, 'apagarLuz').mockResolvedValue(true);
        vi.spyOn(ShellyService, 'apagarAireQuincho').mockResolvedValue(true);
    });

    describe('1. Cabeceras Seguras con Helmet y Bloqueo de Archivos Sensibles', () => {
        it('debe incluir cabeceras de seguridad estrictas (nosniff, DENY) y ocultar X-Powered-By', async () => {
            vi.spyOn(ConfigController, 'ping').mockImplementation((req, res) => res.json({ ok: true, message: 'pong' }));

            const response = await request(app).get('/ping');

            expect(response.status).toBe(200);
            expect(response.headers['x-content-type-options']).toBe('nosniff');
            expect(response.headers['x-frame-options']).toBe('DENY');
            expect(response.headers['strict-transport-security']).toBeDefined();
            // La cabecera x-powered-by debe estar completamente oculta
            expect(response.headers['x-powered-by']).toBeUndefined();
        });

        it('debe rechazar con 403 Forbidden cualquier solicitud a archivos de configuración .env', async () => {
            const responseEnv = await request(app).get('/.env');
            expect(responseEnv.status).toBe(403);
            expect(responseEnv.body.ok).toBe(false);
            expect(responseEnv.body.message).toMatch(/Acceso denegado a recursos protegidos/i);

            const responseApiEnv = await request(app).get('/api/.env');
            expect(responseApiEnv.status).toBe(403);
            expect(responseApiEnv.body.ok).toBe(false);
        });

        it('debe rechazar con 403 Forbidden cualquier intento de consultar directorios .git u ocultos', async () => {
            const responseGit = await request(app).get('/.git/config');
            expect(responseGit.status).toBe(403);
            expect(responseGit.body.ok).toBe(false);

            const responseDotfile = await request(app).get('/.htaccess');
            expect(responseDotfile.status).toBe(403);
            expect(responseDotfile.body.ok).toBe(false);
        });
    });

    describe('2. Prevención de IDOR (Insecure Direct Object References)', () => {
        const reservaVecinoA = {
            id: 55,
            usuario_id: 10, // Pertenece al Usuario A
            fecha: '2026-10-25',
            hora: '18:00',
            tipo: 'cancha',
            estado: 'Pendiente',
            con_aire: 0
        };

        beforeEach(() => {
            vi.spyOn(DefaultReservaRepository, 'getById').mockImplementation(async (id) => {
                if (Number(id) === 55) return { ...reservaVecinoA };
                return null;
            });
        });

        it('debe rechazar con 403 Forbidden si el Usuario B intenta cancelar la reserva del Usuario A', async () => {
            const deleteSpy = vi.spyOn(DefaultReservaRepository, 'deleteById').mockResolvedValue(true);
            const updateSpy = vi.spyOn(DefaultReservaRepository, 'updateById').mockResolvedValue(true);

            const response = await request(app)
                .put('/api/reservas/55/cancelar')
                .set('Authorization', `Bearer ${tokenUsuarioB}`);

            expect(response.status).toBe(403);
            expect(response.body.ok).toBe(false);
            expect(response.body.message).toMatch(/no tienes permiso|Acceso denegado/i);

            // Verificar que no se haya modificado la base de datos
            expect(deleteSpy).not.toHaveBeenCalled();
            expect(updateSpy).not.toHaveBeenCalled();
        });

        it('debe rechazar con 403 Forbidden si el Usuario B intenta consultar por ID la reserva del Usuario A', async () => {
            const response = await request(app)
                .get('/api/reservas/55')
                .set('Authorization', `Bearer ${tokenUsuarioB}`);

            expect(response.status).toBe(403);
            expect(response.body.ok).toBe(false);
            expect(response.body.message).toMatch(/no tienes permiso|Acceso denegado/i);
        });

        it('debe rechazar con 403 Forbidden si el Usuario B intenta modificar la reserva del Usuario A', async () => {
            const updateSpy = vi.spyOn(DefaultReservaRepository, 'updateById').mockResolvedValue(true);

            const response = await request(app)
                .put('/api/reservas/55')
                .set('Authorization', `Bearer ${tokenUsuarioB}`)
                .send({ fecha: '2026-10-26' });

            expect(response.status).toBe(403);
            expect(response.body.ok).toBe(false);
            expect(response.body.message).toMatch(/no tienes permiso|Acceso denegado/i);
            expect(updateSpy).not.toHaveBeenCalled();
        });

        it('debe permitir que el Usuario A cancele su propia reserva exitosamente', async () => {
            const deleteSpy = vi.spyOn(DefaultReservaRepository, 'deleteById').mockResolvedValue(true);

            const response = await request(app)
                .put('/api/reservas/55/cancelar')
                .set('Authorization', `Bearer ${tokenUsuarioA}`);

            expect(response.status).toBe(200);
            expect(response.body.ok).toBe(true);
            expect(deleteSpy).toHaveBeenCalledWith('55');
        });

        it('debe permitir que un Super Administrador o Recepcionista cancele cualquier reserva', async () => {
            const updateSpy = vi.spyOn(DefaultReservaRepository, 'updateById').mockResolvedValue(true);

            const responseAdmin = await request(app)
                .put('/api/reservas/55/cancelar')
                .set('Authorization', `Bearer ${tokenSuperAdmin}`);

            expect(responseAdmin.status).toBe(200);
            expect(responseAdmin.body.ok).toBe(true);
            expect(updateSpy).toHaveBeenCalledWith('55', expect.objectContaining({ estado: 'Cancelado' }));
        });
    });

    describe('3. Protección contra Fuerza Bruta y DoS (Rate Limiting)', () => {
        it('debe interceptar la 6ta petición fallida a /api/auth/login y responder 429 Too Many Requests', async () => {
            vi.spyOn(UserRepository, 'getByEmail').mockResolvedValue(null);

            const badCredentialsPayload = {
                email: 'ataque.fuerzabruta@test.com',
                password: 'WrongPassword999!'
            };

            // Realizamos las primeras 5 peticiones fallidas
            for (let i = 1; i <= 5; i++) {
                const res = await request(app)
                    .post('/api/auth/login')
                    .send(badCredentialsPayload);

                // Esperamos que el login falle con 404 (usuario no encontrado) o 400 (credenciales incorrectas)
                expect([400, 404]).toContain(res.status);
            }

            // La 6ta petición consecutiva debe ser bloqueada por el rate limiter
            const resBloqueada = await request(app)
                .post('/api/auth/login')
                .send(badCredentialsPayload);

            expect(resBloqueada.status).toBe(429);
            expect(resBloqueada.body.ok).toBe(false);
            expect(resBloqueada.body.message).toMatch(/demasiados intentos de inicio de sesión/i);
        });
    });
});
