import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { QuinchoStrategy } from '../src/services/strategies/QuinchoStrategy.js';
import { ServerError } from '../src/error.js';

describe('Suite de Estrategia de Quincho (QuinchoStrategy - SOLID & SRP)', () => {
    let quinchoStrategy;
    let mockReservaRepo;
    let mockConfigRepo;

    beforeEach(() => {
        quinchoStrategy = new QuinchoStrategy();
        mockReservaRepo = {
            getByFecha: vi.fn().mockResolvedValue([])
        };
        mockConfigRepo = {
            getByKey: vi.fn()
        };
    });

    afterEach(() => {
        vi.useRealTimers();
    });

    it('debe tener el tipo "quincho"', () => {
        expect(quinchoStrategy.tipo).toBe('quincho');
    });

    it('debe retornar los turnos estándar de quincho (10:00 y 19:00)', () => {
        const horarios = quinchoStrategy.getHorariosEstandar();
        expect(horarios).toEqual(['10:00', '19:00']);
    });

    describe('Regla de Exclusividad Diaria', () => {
        it('debe permitir la reserva si el día no tiene reservas previas', async () => {
            mockReservaRepo.getByFecha.mockResolvedValue([]);

            await expect(quinchoStrategy.validarDisponibilidad({
                fecha: '2026-11-15',
                hora: '10:00'
            }, { reservaRepo: mockReservaRepo })).resolves.not.toThrow();
        });

        it('debe RECHAZAR con 409 si ya existe una reserva activa para esa fecha', async () => {
            mockReservaRepo.getByFecha.mockResolvedValue([
                { id: 99, tipo: 'quincho', estado: 'Aprobado', hora: '19:00' }
            ]);

            await expect(quinchoStrategy.validarDisponibilidad({
                fecha: '2026-11-15',
                hora: '10:00'
            }, { reservaRepo: mockReservaRepo })).rejects.toThrow(
                /El quincho ya cuenta con una reserva registrada para este día/i
            );
        });

        it('debe permitir la reserva si las reservas existentes están canceladas o rechazadas', async () => {
            mockReservaRepo.getByFecha.mockResolvedValue([
                { id: 99, tipo: 'quincho', estado: 'Cancelado', hora: '10:00' },
                { id: 100, tipo: 'quincho', estado: 'Rechazada', hora: '19:00' }
            ]);

            await expect(quinchoStrategy.validarDisponibilidad({
                fecha: '2026-11-15',
                hora: '19:00'
            }, { reservaRepo: mockReservaRepo })).resolves.not.toThrow();
        });
    });

    describe('Restricción de Reserva Mismo Día (< 10:00 AM)', () => {
        it('debe RECHAZAR con 400 si se intenta reservar para hoy pasadas las 10:00 AM', async () => {
            // Fijar hora del sistema a las 11:30 AM Argentina (UTC-3 => 14:30 UTC)
            vi.useFakeTimers();
            const fechaFija = new Date('2026-10-25T14:30:00.000Z');
            vi.setSystemTime(fechaFija);

            mockReservaRepo.getByFecha.mockResolvedValue([]);

            await expect(quinchoStrategy.validarDisponibilidad({
                fecha: '2026-10-25',
                hora: '19:00'
            }, { reservaRepo: mockReservaRepo })).rejects.toThrow(
                /El alquiler del quincho para el día de hoy ya no se encuentra disponible/i
            );
        });

        it('debe PERMITIR si se intenta reservar para hoy antes de las 10:00 AM', async () => {
            // Fijar hora del sistema a las 08:30 AM Argentina (UTC-3 => 11:30 UTC)
            vi.useFakeTimers();
            const fechaFija = new Date('2026-10-25T11:30:00.000Z');
            vi.setSystemTime(fechaFija);

            mockReservaRepo.getByFecha.mockResolvedValue([]);

            await expect(quinchoStrategy.validarDisponibilidad({
                fecha: '2026-10-25',
                hora: '10:00'
            }, { reservaRepo: mockReservaRepo })).resolves.not.toThrow();
        });

        it('debe PERMITIR reservar para un día futuro independientemente de la hora actual', async () => {
            vi.useFakeTimers();
            const fechaFija = new Date('2026-10-25T20:00:00.000Z'); // 17:00 hs Argentina
            vi.setSystemTime(fechaFija);

            mockReservaRepo.getByFecha.mockResolvedValue([]);

            await expect(quinchoStrategy.validarDisponibilidad({
                fecha: '2026-10-26',
                hora: '10:00'
            }, { reservaRepo: mockReservaRepo })).resolves.not.toThrow();
        });
    });

    describe('Cálculo Tarifario de Quincho', () => {
        it('debe calcular tarifa base sin aire acondicionado', async () => {
            mockConfigRepo.getByKey.mockImplementation(async (key) => {
                if (key === 'precio_quincho') return '25000';
                if (key === 'precio_aire_quincho') return '12000';
                return null;
            });

            const resultado = await quinchoStrategy.calcularPrecio({ con_aire: 0 }, { configRepo: mockConfigRepo });
            expect(resultado).toEqual({
                total: 25000,
                plazoDias: null,
                base: 25000,
                adicionalAire: 0
            });
        });

        it('debe sumar el adicional de aire acondicionado si con_aire está habilitado', async () => {
            mockConfigRepo.getByKey.mockImplementation(async (key) => {
                if (key === 'precio_quincho') return '25000';
                if (key === 'precio_aire_quincho') return '12000';
                return null;
            });

            const resultado = await quinchoStrategy.calcularPrecio({ con_aire: 1 }, { configRepo: mockConfigRepo });
            expect(resultado).toEqual({
                total: 37000,
                plazoDias: null,
                base: 25000,
                adicionalAire: 12000
            });
        });

        it('debe usar valores fallback por defecto si fallan las consultas de configuración', async () => {
            mockConfigRepo.getByKey.mockRejectedValue(new Error('DB Error'));

            const resultado = await quinchoStrategy.calcularPrecio({ con_aire: true }, { configRepo: mockConfigRepo });
            expect(resultado.total).toBe(31500); // 21500 base + 10000 aire
            expect(resultado.base).toBe(21500);
            expect(resultado.adicionalAire).toBe(10000);
        });
    });
});
