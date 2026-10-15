import { describe, it, expect, vi, beforeEach } from 'vitest';
import { ReservaService } from '../src/services/ReservaService.js';
import { ReservaRepository } from '../src/repositories/reserva.repository.js';
import { UserRepository } from '../src/repositories/user.repository.js';
import NotificationService from '../src/services/NotificationService.js';

describe('Suite de Concurrencia y Transaccionalidad ACID (CON-01 & ARC-01)', () => {
    beforeEach(() => {
        vi.clearAllMocks();
    });

    describe('Prevención de Doble Reserva Concurrente (CON-01 / Double Booking)', () => {
        it('debe confirmar solo una reserva y rechazar la segunda con 409 Conflict ante solicitudes simultáneas', async () => {
            // Repositorio en memoria simulando el bloqueo de fila y concurrencia de MySQL (FOR UPDATE)
            const baseDeDatos = new Map();
            let bloqueoEnCurso = false;

            const fakeRepo = {
                findByUsuarioYSemana: vi.fn().mockResolvedValue([]),
                getByFecha: vi.fn().mockResolvedValue([]),
                findByFechaHora: vi.fn().mockImplementation(async (fecha, hora, tipo) => {
                    const key = `${fecha}_${hora}_${tipo}`;
                    // Si ya existe o está bloqueado por la primera transacción concurrente
                    if (baseDeDatos.has(key)) {
                        return baseDeDatos.get(key);
                    }
                    if (bloqueoEnCurso) {
                        // Simula que la transacción 1 ya tomó el bloqueo FOR UPDATE sobre el slot
                        return { id: 999, fecha, hora, tipo, estado: 'Pendiente' };
                    }
                    bloqueoEnCurso = true;
                    return null;
                }),
                create: vi.fn().mockImplementation(async (data) => {
                    const key = `${data.fecha}_${data.hora}_${data.tipo}`;
                    const created = { id: Math.floor(Math.random() * 1000) + 1, ...data };
                    baseDeDatos.set(key, created);
                    return created;
                })
            };

            const fakeConfig = {
                getByKey: vi.fn().mockResolvedValue('5000')
            };

            const fakePool = {
                getConnection: vi.fn().mockResolvedValue({
                    beginTransaction: vi.fn().mockResolvedValue(),
                    commit: vi.fn().mockResolvedValue(),
                    rollback: vi.fn().mockResolvedValue(),
                    release: vi.fn().mockResolvedValue()
                })
            };

            const fakeNotification = {
                enviarConfirmacionReserva: vi.fn().mockResolvedValue(true)
            };

            const service = new ReservaService(fakeRepo, fakeConfig, fakeNotification, fakePool);

            // Simulación de 2 solicitudes concurrentes (Promise.allSettled)
            const reservaPayload1 = {
                usuario_id: 10,
                tipo: 'cancha',
                fecha: '2026-11-25',
                hora: '18:00',
                con_aire: 0
            };

            const reservaPayload2 = {
                usuario_id: 20,
                tipo: 'cancha',
                fecha: '2026-11-25',
                hora: '18:00',
                con_aire: 0
            };

            const [intento1, intento2] = await Promise.allSettled([
                service.create(reservaPayload1),
                service.create(reservaPayload2)
            ]);

            const confirmadas = [intento1, intento2].filter(r => r.status === 'fulfilled');
            const rechazadas = [intento1, intento2].filter(r => r.status === 'rejected');

            // 🔒 Certificación: Exactamente una reserva confirmada
            expect(confirmadas).toHaveLength(1);
            expect(confirmadas[0].value).toHaveProperty('id');
            expect(confirmadas[0].value.fecha).toBe('2026-11-25');
            expect(confirmadas[0].value.hora).toBe('18:00');

            // 🔒 Certificación: La segunda rechazada con 409 Conflict
            expect(rechazadas).toHaveLength(1);
            expect(rechazadas[0].reason.status).toBe(409);
            expect(rechazadas[0].reason.message).toMatch(/ocupado|bloqueado/i);
        });
    });

    describe('Transaccionalidad ACID en Cascada (ARC-01)', () => {
        it('debe ejecutar rollback y no eliminar reservas si la eliminación del usuario falla en BD', async () => {
            const mockConnection = {
                beginTransaction: vi.fn().mockResolvedValue(),
                query: vi.fn()
                    .mockResolvedValueOnce([{ affectedRows: 3 }]) // 1. DELETE reservas (OK)
                    .mockRejectedValueOnce(new Error('Fallo de integridad o desconexión en usuarios')), // 2. DELETE usuario (FALLO)
                commit: vi.fn().mockResolvedValue(),
                rollback: vi.fn().mockResolvedValue(),
                release: vi.fn().mockResolvedValue()
            };

            const mockPool = {
                getConnection: vi.fn().mockResolvedValue(mockConnection)
            };

            const userRepo = new UserRepository(mockPool);

            // Ejecución de eliminación de usuario ID 55
            await expect(userRepo.deleteById(55)).rejects.toThrow('Fallo de integridad o desconexión en usuarios');

            // 🔒 Certificación: Se inició la transacción
            expect(mockConnection.beginTransaction).toHaveBeenCalledTimes(1);

            // 🔒 Certificación: Se ejecutó Rollback para evitar borrado a medias de reservas
            expect(mockConnection.rollback).toHaveBeenCalledTimes(1);

            // 🔒 Certificación: Commit NUNCA fue llamado
            expect(mockConnection.commit).not.toHaveBeenCalled();

            // 🔒 Certificación: La conexión fue liberada en el bloque finally
            expect(mockConnection.release).toHaveBeenCalledTimes(1);
        });

        it('debe hacer commit exitoso y liberar la conexión si ambas eliminaciones (reservas + usuario) tienen éxito', async () => {
            const mockConnection = {
                beginTransaction: vi.fn().mockResolvedValue(),
                query: vi.fn()
                    .mockResolvedValueOnce([{ affectedRows: 2 }]) // 1. DELETE reservas
                    .mockResolvedValueOnce([{ affectedRows: 1 }]), // 2. DELETE usuario
                commit: vi.fn().mockResolvedValue(),
                rollback: vi.fn().mockResolvedValue(),
                release: vi.fn().mockResolvedValue()
            };

            const mockPool = {
                getConnection: vi.fn().mockResolvedValue(mockConnection)
            };

            const userRepo = new UserRepository(mockPool);

            const result = await userRepo.deleteById(88);

            expect(result).toBe(true);
            expect(mockConnection.beginTransaction).toHaveBeenCalledTimes(1);
            expect(mockConnection.commit).toHaveBeenCalledTimes(1);
            expect(mockConnection.rollback).not.toHaveBeenCalled();
            expect(mockConnection.release).toHaveBeenCalledTimes(1);
        });
    });
});
