import { describe, it, expect, vi, beforeEach } from 'vitest';
import { CanchaStrategy } from '../src/services/strategies/CanchaStrategy.js';
import { ServerError } from '../src/error.js';

describe('Suite de Estrategia de Cancha (CanchaStrategy - SOLID & SRP)', () => {
    let canchaStrategy;
    let mockReservaRepo;
    let mockConfigRepo;

    beforeEach(() => {
        canchaStrategy = new CanchaStrategy();
        mockReservaRepo = {
            findByUsuarioYSemana: vi.fn(),
            getByFecha: vi.fn()
        };
        mockConfigRepo = {
            getByKey: vi.fn()
        };
    });

    it('debe tener el tipo "cancha"', () => {
        expect(canchaStrategy.tipo).toBe('cancha');
    });

    it('debe retornar los horarios estándar de cancha (07:00 a 00:00)', () => {
        const horarios = canchaStrategy.getHorariosEstandar();
        expect(horarios).toContain('07:00');
        expect(horarios).toContain('14:00');
        expect(horarios).toContain('23:00');
        expect(horarios).toContain('00:00');
        expect(horarios.length).toBe(18);
    });

    describe('Reglas de Cupo Semanal y Turno de Último Momento', () => {
        it('debe permitir la primera reserva de la semana (0 reservas previas)', async () => {
            mockReservaRepo.findByUsuarioYSemana.mockResolvedValue([]);

            await expect(canchaStrategy.validarDisponibilidad({
                usuario_id: 10,
                usuario_rol: 'usuario',
                fecha: '2026-10-20',
                hora: '18:00'
            }, { reservaRepo: mockReservaRepo })).resolves.not.toThrow();
        });

        it('debe permitir la segunda reserva de la semana (1 reserva previa)', async () => {
            mockReservaRepo.findByUsuarioYSemana.mockResolvedValue([{ id: 101 }]);

            await expect(canchaStrategy.validarDisponibilidad({
                usuario_id: 10,
                usuario_rol: 'usuario',
                fecha: '2026-10-20',
                hora: '18:00'
            }, { reservaRepo: mockReservaRepo })).resolves.not.toThrow();
        });

        const formatLocal = (d) => {
            const yyyy = d.getFullYear();
            const mm = String(d.getMonth() + 1).padStart(2, '0');
            const dd = String(d.getDate()).padStart(2, '0');
            const hh = String(d.getHours()).padStart(2, '0');
            return {
                fecha: `${yyyy}-${mm}-${dd}`,
                hora: `${hh}:00`
            };
        };

        it('debe RECHAZAR la tercera reserva si faltan más de 8 horas para el turno', async () => {
            mockReservaRepo.findByUsuarioYSemana.mockResolvedValue([{ id: 101 }, { id: 102 }]);

            // Turno dentro de 24 horas (más de 8 horas)
            const futuro = new Date(Date.now() + 24 * 60 * 60 * 1000);
            const { fecha, hora } = formatLocal(futuro);

            await expect(canchaStrategy.validarDisponibilidad({
                usuario_id: 10,
                usuario_rol: 'usuario',
                fecha,
                hora
            }, { reservaRepo: mockReservaRepo })).rejects.toThrow(
                /Ya tienes el máximo de 2 reservas de cancha para esta semana/i
            );
        });

        it('debe PERMITIR una tercera reserva si es de "último momento" (< 8 horas antes del inicio)', async () => {
            mockReservaRepo.findByUsuarioYSemana.mockResolvedValue([{ id: 101 }, { id: 102 }]);

            // Turno dentro de 3 horas (< 8 horas)
            const en3Horas = new Date(Date.now() + 3 * 60 * 60 * 1000);
            const { fecha, hora } = formatLocal(en3Horas);

            await expect(canchaStrategy.validarDisponibilidad({
                usuario_id: 10,
                usuario_rol: 'usuario',
                fecha,
                hora
            }, { reservaRepo: mockReservaRepo })).resolves.not.toThrow();
        });

        it('debe RECHAZAR una cuarta reserva incluso si es de último momento (máximo 3 turnos)', async () => {
            mockReservaRepo.findByUsuarioYSemana.mockResolvedValue([{ id: 101 }, { id: 102 }, { id: 103 }]);

            const en2Horas = new Date(Date.now() + 2 * 60 * 60 * 1000);
            const { fecha, hora } = formatLocal(en2Horas);

            await expect(canchaStrategy.validarDisponibilidad({
                usuario_id: 10,
                usuario_rol: 'usuario',
                fecha,
                hora
            }, { reservaRepo: mockReservaRepo })).rejects.toThrow(
                /Ya alcanzaste el cupo máximo de 3 reservas de cancha/i
            );
        });

        it('debe omitir las validaciones de límite para super_admin y recepcionista', async () => {
            await expect(canchaStrategy.validarDisponibilidad({
                usuario_id: 1,
                usuario_rol: 'super_admin',
                fecha: '2026-10-20',
                hora: '18:00'
            }, { reservaRepo: mockReservaRepo })).resolves.not.toThrow();

            await expect(canchaStrategy.validarDisponibilidad({
                usuario_id: 2,
                usuario_rol: 'recepcionista',
                fecha: '2026-10-20',
                hora: '18:00'
            }, { reservaRepo: mockReservaRepo })).resolves.not.toThrow();

            expect(mockReservaRepo.findByUsuarioYSemana).not.toHaveBeenCalled();
        });
    });

    describe('Cálculo Tarifario de Cancha', () => {
        it('debe calcular tarifa usando el valor de ConfigRepository', async () => {
            mockConfigRepo.getByKey.mockResolvedValue('7500');

            const resultado = await canchaStrategy.calcularPrecio({}, { configRepo: mockConfigRepo });
            expect(resultado).toEqual({
                total: 7500,
                plazoDias: 2
            });
            expect(mockConfigRepo.getByKey).toHaveBeenCalledWith('precio_cancha');
        });

        it('debe usar tarifa fallback si falla o no está en ConfigRepository', async () => {
            mockConfigRepo.getByKey.mockRejectedValue(new Error('DB error'));

            const resultado = await canchaStrategy.calcularPrecio({}, { configRepo: mockConfigRepo });
            expect(resultado.total).toBe(5000);
            expect(resultado.plazoDias).toBe(2);
        });
    });
});
