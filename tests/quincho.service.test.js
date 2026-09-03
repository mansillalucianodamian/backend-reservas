import { describe, it, expect, vi, beforeEach } from 'vitest';
import ReservaService from '../src/services/ReservaService.js';
import ReservaRepository from '../src/repositories/reserva.repository.js';
import ConfigRepository from '../src/repositories/config.repository.js';
import NotificationService from '../src/services/NotificationService.js';

describe('Servicio de Quincho - Reglas de Negocio y Tarifas', () => {
    beforeEach(() => {
        vi.clearAllMocks();
    });

    describe('Disponibilidad y Exclusividad Diaria', () => {
        it('debe devolver horarios 10:00 y 19:00 disponibles cuando no hay reservas previas', async () => {
            vi.spyOn(ReservaRepository, 'getByFecha').mockResolvedValue([]);

            const slots = await ReservaService.getDisponibles('2026-10-10', 'quincho');

            expect(slots).toEqual([
                { hora: '10:00', disponible: true },
                { hora: '19:00', disponible: true }
            ]);
        });

        it('debe bloquear ambos horarios si ya existe una reserva activa para esa fecha (Turno Único por Día)', async () => {
            vi.spyOn(ReservaRepository, 'getByFecha').mockResolvedValue([
                {
                    id: 10,
                    tipo: 'quincho',
                    fecha: '2026-10-10',
                    hora: '10:00:00',
                    estado: 'Pendiente'
                }
            ]);

            const slots = await ReservaService.getDisponibles('2026-10-10', 'quincho');

            expect(slots).toEqual([
                { hora: '10:00', disponible: false },
                { hora: '19:00', disponible: false }
            ]);
        });

        it('debe permitir disponibilidad si la reserva previa para esa fecha fue Cancelada', async () => {
            vi.spyOn(ReservaRepository, 'getByFecha').mockResolvedValue([
                {
                    id: 11,
                    tipo: 'quincho',
                    fecha: '2026-10-10',
                    hora: '10:00:00',
                    estado: 'Cancelado'
                }
            ]);

            const slots = await ReservaService.getDisponibles('2026-10-10', 'quincho');

            expect(slots).toEqual([
                { hora: '10:00', disponible: true },
                { hora: '19:00', disponible: true }
            ]);
        });

        it('debe rechazar la creación de una segunda reserva en el mismo día para quincho', async () => {
            vi.spyOn(ReservaRepository, 'getByFecha').mockResolvedValue([
                {
                    id: 12,
                    tipo: 'quincho',
                    fecha: '2026-10-15',
                    hora: '10:00',
                    estado: 'Aprobado'
                }
            ]);

            await expect(ReservaService.create({
                usuario_id: 1,
                tipo: 'quincho',
                fecha: '2026-10-15',
                hora: '19:00',
                con_aire: 0
            })).rejects.toThrow('El quincho ya cuenta con una reserva registrada para este día');
        });
    });

    describe('Cálculo de Tarifas con Aire Acondicionado Editable', () => {
        beforeEach(() => {
            vi.spyOn(NotificationService, 'enviarConfirmacionReserva').mockResolvedValue(true);
            vi.spyOn(ReservaRepository, 'findByFechaHora').mockResolvedValue(null);
            vi.spyOn(ReservaRepository, 'getByFecha').mockResolvedValue([]);
            vi.spyOn(ReservaRepository, 'create').mockImplementation(async (data) => ({
                id: 99,
                ...data
            }));
        });

        it('debe calcular el precio base del quincho sin aire acondicionado', async () => {
            vi.spyOn(ConfigRepository, 'getByKey').mockImplementation(async (key) => {
                if (key === 'precio_quincho') return '25000';
                if (key === 'precio_aire_quincho') return '15000';
                return null;
            });

            const sendMailSpy = vi.spyOn(NotificationService, 'enviarConfirmacionReserva');

            await ReservaService.create({
                usuario_id: 1,
                tipo: 'quincho',
                fecha: '2026-11-20',
                hora: '10:00',
                con_aire: 0
            });

            expect(sendMailSpy).toHaveBeenCalledWith(
                1,
                expect.objectContaining({ tipo: 'quincho' }),
                1,
                25000, // Solo precio base
                null
            );
        });

        it('debe sumar el precio del aire acondicionado al precio base cuando con_aire es true', async () => {
            vi.spyOn(ConfigRepository, 'getByKey').mockImplementation(async (key) => {
                if (key === 'precio_quincho') return '25000';
                if (key === 'precio_aire_quincho') return '15000';
                return null;
            });

            const sendMailSpy = vi.spyOn(NotificationService, 'enviarConfirmacionReserva');

            await ReservaService.create({
                usuario_id: 2,
                tipo: 'quincho',
                fecha: '2026-11-21',
                hora: '19:00',
                con_aire: 1
            });

            expect(sendMailSpy).toHaveBeenCalledWith(
                2,
                expect.objectContaining({ tipo: 'quincho', con_aire: 1 }),
                1,
                40000, // 25000 base + 15000 aire
                null
            );
        });

        it('debe usar los valores por defecto si no existen claves en la base de datos', async () => {
            vi.spyOn(ConfigRepository, 'getByKey').mockResolvedValue(null);

            const sendMailSpy = vi.spyOn(NotificationService, 'enviarConfirmacionReserva');

            await ReservaService.create({
                usuario_id: 3,
                tipo: 'quincho',
                fecha: '2026-11-22',
                hora: '10:00',
                con_aire: 1
            });

            expect(sendMailSpy).toHaveBeenCalledWith(
                3,
                expect.objectContaining({ tipo: 'quincho' }),
                1,
                31500, // 21500 default base + 10000 default aire
                null
            );
        });
    });

    describe('Consulta de Fechas Ocupadas para Calendario', () => {
        it('debe consultar y retornar la lista de fechas ocupadas para quincho', async () => {
            vi.spyOn(ReservaRepository, 'getFechasOcupadas').mockResolvedValue(['2026-09-15', '2026-09-20']);

            const fechas = await ReservaService.getFechasOcupadas('quincho');
            expect(fechas).toEqual(expect.arrayContaining(['2026-09-15', '2026-09-20']));
            expect(ReservaRepository.getFechasOcupadas).toHaveBeenCalledWith('quincho');
        });

        it('debe bloquear ambos turnos del día de hoy para quincho si ya pasaron las 10:00 hs', async () => {
            vi.spyOn(ReservaRepository, 'getByFecha').mockResolvedValue([]);
            const hoy = new Date();
            const hoyStr = `${hoy.getFullYear()}-${String(hoy.getMonth() + 1).padStart(2, '0')}-${String(hoy.getDate()).padStart(2, '0')}`;

            const disponibles = await ReservaService.getDisponibles(hoyStr, 'quincho');
            // Si la prueba corre pasadas las 10hs, ambos turnos deben estar bloqueados (disponible: false)
            const horaActual = new Date().getHours();
            if (horaActual >= 10) {
                expect(disponibles).toEqual([
                    { hora: '10:00', disponible: false },
                    { hora: '19:00', disponible: false }
                ]);
            }
        });
    });
});
